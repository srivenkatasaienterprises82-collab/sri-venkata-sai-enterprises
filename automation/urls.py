"""
URL verification and AI-assisted auto-repair for Flipkart product URLs.

Modes:
  --mode verify  Dry-run audit; writes url-audit.csv (no Sanity writes).
  --mode apply   Reads url-audit.csv and patches Sanity with approved fixes.
  --mode sync    Single-product verify-and-fix; called by sync.py inline.

Design (Change 2: verify before scrape, Change 8: AI resolver).
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Sequence

from automation.listing import get_brand_listings
from automation.sanity_api import (
    fetch_all_products,
    fetch_existing_slugs,
    unique_slug,
    update_url,
)
from automation.utils import (
    is_match,
    url_name_matches,
    url_color_matches,
    identity_confidence,
    price_in_bounds,
    _norm_name,
)

FLIPKART_BRAND_SLUGS = [
    "apple",
    "samsung",
    "motorola",
    "oppo",
    "vivo",
    "poco",
    "redmi",
    "realme",
    "nothing",
    "iqoo",
    "oneplus",
    "pixel",
    "google",
    "hmd",
    "infinix",
]
FLIPKART_SEARCH = "https://www.flipkart.com/search?q={brand}"

MIN_URL_CONFIDENCE = 0.92
MAX_URL_CANDIDATES = 10
MAX_AUDIT_ROWS = 200

WRITE_DECISIONS = {
    "url_replaced",
    "auto_found",
    "color_mismatch_fixed",
    "name_mismatch_fixed",
}


@dataclass
class Candidate:
    name: str
    url: str
    score: float
    detail: dict = field(default_factory=dict)


@dataclass
class VerifyResult:
    action: str  # verified|patched|reject|skip
    reason: str = ""
    new_url: str = ""
    confidence: float = 0.0


def _search_and_score(product: dict, brand_slug: str) -> list[Candidate]:
    out: list[Candidate] = []
    seen: set[str] = set()
    try:
        listings = get_brand_listings(brand_slug, "flipkart")
    except Exception:
        return out
    for name, url in listings:
        if url in seen:
            continue
        seen.add(url)
        if not is_match(product.get("name", ""), name):
            continue
        score, detail = identity_confidence(product, url)
        out.append(Candidate(name=name, url=url, score=score, detail=detail))
    out.sort(key=lambda c: c.score, reverse=True)
    return out[:MAX_URL_CANDIDATES]


def _best_above(candidates: Sequence[Candidate], threshold: float) -> Candidate | None:
    for c in candidates:
        if c.score >= threshold:
            return c
    return None


def _is_real_product_page(url: str) -> bool:
    try:
        import requests
        from automation.http_helper import is_interstitial, random_user_agent, new_session
        session = new_session()
        result = __import__("automation.http_helper", fromlist=["get_with_retry"]).get_with_retry(
            session, url, timeout=30, max_tries=1
        )
        if not result.ok:
            return False
        html = result.html or ""
        if is_interstitial(html):
            return False
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        if soup.find("div", class_="_1AtVbE") or soup.find("h1"):
            return True
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = __import__("json").loads(script.string or "")
            except Exception:
                continue
            items = data if isinstance(data, list) else [data]
            if any(
                isinstance(it, dict)
                and (it.get("@type") in ("Product", "AggregateOffer") or "offers" in it)
                for it in items
            ):
                return True
        return False
    except Exception:
        return False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Per-product verification
# ---------------------------------------------------------------------------

def verify_product(product: dict) -> VerifyResult:
    brand_slug = (product.get("brandSlug") or "").lower()
    name = product.get("name", "")
    colors = product.get("colors") or []
    url = (product.get("flipkartUrl") or "").strip()

    if not brand_slug or brand_slug not in FLIPKART_BRAND_SLUGS:
        return VerifyResult(action="skip", reason="not_flipkart_routed")

    if not url:
        candidates = _search_and_score(product, brand_slug)
        best = _best_above(candidates, MIN_URL_CONFIDENCE)
        if best:
            return VerifyResult(
                action="patched",
                reason="auto_found",
                new_url=best.url,
                confidence=best.score,
            )
        return VerifyResult(action="reject", reason="no_url_found", confidence=0.0)

    if not _is_real_product_page(url):
        candidates = _search_and_score(product, brand_slug)
        best = _best_above(candidates, MIN_URL_CONFIDENCE)
        if best:
            return VerifyResult(
                action="patched",
                reason="bad_page_replaced",
                new_url=best.url,
                confidence=best.score,
            )
        return VerifyResult(action="reject", reason="bad_page", confidence=0.0)

    if not url_name_matches(name, url):
        candidates = _search_and_score(product, brand_slug)
        best = _best_above(candidates, MIN_URL_CONFIDENCE)
        if best:
            return VerifyResult(
                action="patched",
                reason="name_mismatch_fixed",
                new_url=best.url,
                confidence=best.score,
            )
        return VerifyResult(action="reject", reason="name_mismatch_unresolved", confidence=0.0)

    if not url_color_matches(name, url, colors):
        candidates = _search_and_score(product, brand_slug)
        best = _best_above(candidates, MIN_URL_CONFIDENCE)
        if best:
            return VerifyResult(
                action="patched",
                reason="color_mismatch_fixed",
                new_url=best.url,
                confidence=best.score,
            )
        return VerifyResult(action="reject", reason="color_mismatch_unresolved", confidence=0.0)

    return VerifyResult(action="verified", reason="ok", confidence=1.0)


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

def run_verify(output_path: str) -> int:
    products = fetch_all_products()
    rows: list[dict] = []
    patch_count = 0
    for p in products:
        brand_slug = (p.get("brandSlug") or "").lower()
        name = p.get("name", "")
        old_url = (p.get("flipkartUrl") or "").strip()
        result = verify_product(p)
        confidence = result.confidence
        if result.action == "patched":
            patch_count += 1
            decision = result.reason
            new_url = result.new_url
        elif result.action == "verified":
            decision = "verified"
            new_url = old_url
        else:
            decision = result.reason
            new_url = "(none)"
        if len(rows) < MAX_AUDIT_ROWS:
            rows.append({
                "product_id": p.get("_id", ""),
                "product_name": name,
                "brand_slug": brand_slug,
                "old_url": old_url,
                "new_url": new_url,
                "decision": decision,
                "reason": result.reason,
                "confidence": round(confidence, 4),
            })
    fieldnames = [
        "product_id",
        "product_name",
        "brand_slug",
        "old_url",
        "new_url",
        "decision",
        "reason",
        "confidence",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"verify: {len(products)} products audited, {patch_count} fixes proposed, {len(rows)} rows -> {output_path}")
    return 0


def run_apply(csv_path: str) -> int:
    if not os.path.exists(csv_path):
        print(f"apply: CSV not found: {csv_path}")
        return 2
    from automation.sanity_api import update_url as _patch_url
    ok = 0
    fail = 0
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            decision = row.get("decision", "")
            if decision not in WRITE_DECISIONS:
                continue
            pid = row.get("product_id", "").strip()
            new_url = row.get("new_url", "").strip()
            if not pid or not new_url or new_url == "(none)":
                continue
            try:
                _patch_url(pid, new_url)
                ok += 1
            except Exception as e:
                print(f"  FAIL {pid}: {e}")
                fail += 1
    print(f"apply: {ok} URLs patched, {fail} failures")
    return fail


def run_sync(product: dict) -> tuple[str, str, str]:
    """Verify-and-fix for a single product. Returns (action, reason, new_url)."""
    brand_slug = (product.get("brandSlug") or "").lower()
    if not brand_slug or brand_slug not in FLIPKART_BRAND_SLUGS:
        return "skip", "not_flipkart_routed", ""
    result = verify_product(product)
    if result.action == "patched":
        try:
            from automation.sanity_api import update_url as _patch_url
            _patch_url(product["_id"], result.new_url)
            return "patched", result.reason, result.new_url
        except Exception as e:
            return "reject", f"patch_failed:{e}", ""
    return result.action, result.reason, result.new_url


def main() -> int:
    ap = argparse.ArgumentParser(description="Flipkart URL verification and repair")
    ap.add_argument("--mode", choices=["verify", "apply", "sync"], required=True)
    ap.add_argument("--output", default="url-audit.csv")
    ap.add_argument("--csv", default="url-audit.csv")
    ap.add_argument("--product-id", default="")
    args = ap.parse_args()

    if args.mode == "verify":
        return run_verify(args.output)
    if args.mode == "apply":
        return run_apply(args.csv)
    if args.mode == "sync":
        product_id = args.product_id
        if not product_id:
            print("sync: --product-id is required")
            return 2
        products = fetch_all_products()
        product = next((p for p in products if p.get("_id") == product_id), None)
        if not product:
            print(f"sync: product not found: {product_id}")
            return 2
        action, reason, new_url = run_sync(product)
        print(f"url_sync: {product_id} -> {action} | {reason} | {new_url}")
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
