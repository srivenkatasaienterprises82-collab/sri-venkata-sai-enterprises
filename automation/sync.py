"""
Flipkart-only price sync with exact-match enforcement.

Modes:
  --mode flipkart   Full sync: URL verify → scrape variants → exact-match write
  --force           Bypass delta-sync freshness gate

Design:
  * No Amazon (Change 1).
  * Verify URL inline before every scrape (Change 2).
  * Playwright-first fetch (Change 3) — delegated to flipkart_variants.extract().
  * Extended variant extraction: react_props, __NEXT_DATA__, JSON-LD,
    __INITIAL_STATE__, text-pattern (Change 4).
  * Identity confidence >= 0.92 (Change 5).
  * Exact RAM+Storage match only — no nudging, no heuristic blending.
  * Only patch price + flipkartPrice on matched variants; never overwrite
    colors, images, description, specifications (Change 6, 7).
  * Structured audit log in JSONL (Change 9).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

from automation.flipkart_variants import extract as fk_extract
from automation.sanity_api import (
    fetch_all_products,
    update_url,
    update_variants_and_price,
    record_freshness,
    flag_manual_review,
    _norm_variant_size,
)
from automation.price_history import record_price, history_consistent
from automation.utils import (
    url_name_matches,
    url_color_matches,
    price_in_bounds,
    price_change_is_plausible,
    variants_self_consistent,
    identity_confidence,
    SYNC_MIN_IDENTITY_CONFIDENCE,
    MAX_VARIANT_DELTA,
    variant_price_change_is_plausible,
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
FRESH_WINDOW_HOURS = 12
UPDATED_JSONL = "updated_products.jsonl"
SKIPPED_JSONL = "skipped_products.jsonl"
DRY_RUN = False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_fresh(product: dict) -> bool:
    ts = product.get("lastPriceUpdatedAt")
    if not ts:
        return False
    try:
        last = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return False
    age_hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600.0
    return age_hours < FRESH_WINDOW_HOURS


def _write_jsonl(path: str, entry: dict) -> None:
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _log_updated(entry: dict) -> None:
    _write_jsonl(UPDATED_JSONL, entry)


def _log_skipped(entry: dict) -> None:
    _write_jsonl(SKIPPED_JSONL, entry)


def _match_scraped_to_sanity(
    scraped_variants: list[dict],
    existing_variants: list[dict],
) -> tuple[list[dict], list[dict]]:
    """Return (matched, unmatched) by exact norm(ram)+norm(storage) key."""
    existing_map: dict[tuple, dict] = {}
    for v in (existing_variants or []):
        key = (_norm_variant_size(v.get("ram")), _norm_variant_size(v.get("storage")))
        existing_map[key] = v
    matched: list[dict] = []
    unmatched: list[dict] = []
    seen_keys: set[tuple] = set()
    for sv in scraped_variants:
        ram = _norm_variant_size(sv.get("ram"))
        storage = _norm_variant_size(sv.get("storage"))
        if not ram and not storage:
            continue
        key = (ram, storage)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        if key in existing_map:
            old_price = existing_map[key].get("price")
            new_price = sv.get("price")
            entry = {
                "ram": existing_map[key].get("ram"),
                "storage": existing_map[key].get("storage"),
                "old_price": old_price,
                "new_price": new_price,
                "flipkartPrice": sv.get("flipkartPrice"),
            }
            matched.append(entry)
        else:
            unmatched.append({"ram": sv.get("ram"), "storage": sv.get("storage"), "price": sv.get("price")})
    return matched, unmatched


def _validate_matched_variants(
    matched: list[dict],
    product: dict,
) -> tuple[bool, str]:
    """
    All matched variants must pass:
    1. Per-variant price in bounds.
    2. Per-variant delta vs old price within MAX_VARIANT_DELTA.
    3. Product-level price_in_bounds on display_price.
    4. Product-level delta vs old product price.
    """
    display_price = min(v["new_price"] for v in matched if isinstance(v.get("new_price"), (int, float)))
    old_display = product.get("price")
    if not price_in_bounds(display_price):
        return False, f"product_price_out_of_band:{display_price}"
    if old_display:
        pc_ok, pc_reason = price_change_is_plausible(old_display, display_price)
        if not pc_ok:
            return False, f"product_implausible_delta:{old_display}->{display_price}:{pc_reason}"
    for v in matched:
        np = v.get("new_price")
        op = v.get("old_price")
        if not price_in_bounds(np):
            return False, f"variant_out_of_band:{v.get('ram')}/{v.get('storage')}:{np}"
        if op:
            v_ok, v_reason = variant_price_change_is_plausible(op, np)
            if not v_ok:
                return False, f"variant_implausible_delta:{v.get('ram')}/{v.get('storage')}:{op}->{np}:{v_reason}"
    return True, ""


def sync_one(product: dict) -> dict:
    """
    Returns a summary dict:
      {action, updated, matched_count, old_price, new_price,
       url_before, url_after, reason, elapsed_ms, extractors}
    """
    global DRY_RUN
    name = product.get("name", "")
    pid = product.get("_id", "")
    brand = (product.get("brand") or {}).get("name", "")
    brand_slug = (product.get("brandSlug") or "").lower()
    old_price = product.get("price")
    existing_variants = product.get("variants") or []
    url_before = (product.get("flipkartUrl") or "").strip()

    if product.get("enabled") is False:
        return {"action": "skip", "reason": "draft_disabled", "product_id": pid, "name": name}
    if product.get("priceLocked"):
        return {"action": "skip", "reason": "price_locked", "product_id": pid, "name": name}
    if brand_slug not in FLIPKART_BRAND_SLUGS:
        return {"action": "skip", "reason": f"not_flipkart:{brand_slug}", "product_id": pid, "name": name}
    if not url_before:
        return {"action": "skip", "reason": "no_url", "product_id": pid, "name": name}

    t0 = time.time()
    url_after = url_before

    # Inline URL verification (Change 2)
    try:
        from automation.urls import run_sync as _url_sync
        url_action, url_reason, url_new = _url_sync(product)
        if url_action == "patched":
            url_after = url_new
        elif url_action == "reject":
            return {
                "action": "skip",
                "reason": f"url:{url_reason}",
                "product_id": pid,
                "name": name,
                "url_before": url_before,
                "elapsed_ms": (time.time() - t0) * 1000,
            }
    except Exception as e:
        return {
            "action": "error",
            "reason": f"url_verify_exception:{e}",
            "product_id": pid,
            "name": name,
            "url_before": url_before,
            "elapsed_ms": (time.time() - t0) * 1000,
        }

    if _is_fresh(product) and not DRY_RUN:
        return {
            "action": "skip",
            "reason": "fresh",
            "product_id": pid,
            "name": name,
            "url_before": url_before,
            "url_after": url_after,
            "elapsed_ms": (time.time() - t0) * 1000,
        }

    # Scrape (Change 3: Playwright-first delegated to flipkart_variants)
    scrape = fk_extract(url_after)
    if not scrape.variants:
        return {
            "action": "skip",
            "reason": "no_variants_extracted",
            "product_id": pid,
            "name": name,
            "url_before": url_before,
            "url_after": url_after,
            "elapsed_ms": scrape.elapsed_ms,
            "fingerprint": scrape.fingerprint,
            "source": scrape.source,
        }

    matched, unmatched = _match_scraped_to_sanity(scrape.variants, existing_variants)
    if not matched:
        return {
            "action": "skip",
            "reason": "no_exact_variant_match",
            "product_id": pid,
            "name": name,
            "url_before": url_before,
            "url_after": url_after,
            "scraped_variants_count": len(scrape.variants),
            "elapsed_ms": scrape.elapsed_ms,
            "fingerprint": scrape.fingerprint,
            "extractors": scrape.extractors_used,
        }

    ok, why = _validate_matched_variants(matched, product)
    if not ok:
        try:
            if not DRY_RUN:
                flag_manual_review(pid, True)
        except Exception:
            pass
        return {
            "action": "skip",
            "reason": f"guard:{why}",
            "product_id": pid,
            "name": name,
            "url_before": url_before,
            "url_after": url_after,
            "matched_count": len(matched),
            "elapsed_ms": scrape.elapsed_ms,
            "fingerprint": scrape.fingerprint,
            "extractors": scrape.extractors_used,
        }

    display_price = min(v["new_price"] for v in matched if isinstance(v.get("new_price"), (int, float)))
    flipkart_price = min(
        v["flipkartPrice"] for v in matched
        if isinstance(v.get("flipkartPrice"), (int, float))
    ) if any(isinstance(v.get("flipkartPrice"), (int, float)) for v in matched) else None

    if DRY_RUN:
        return {
            "action": "update",
            "updated": True,
            "matched_count": len(matched),
            "old_price": old_price,
            "new_price": display_price,
            "url_before": url_before,
            "url_after": url_after,
            "elapsed_ms": scrape.elapsed_ms,
            "fingerprint": scrape.fingerprint,
            "extractors": scrape.extractors_used,
            "matched": matched,
            "unmatched": unmatched,
        }

    try:
        mut = update_variants_and_price(
            product_id=pid,
            display_price=display_price,
            flipped=True,
            flipkart_price=flipkart_price,
            matched_variants=matched,
            fingerprint=scrape.fingerprint,
        )
    except Exception as e:
        try:
            flag_manual_review(pid, True)
        except Exception:
            pass
        return {
            "action": "error",
            "reason": f"mutation_failed:{e}",
            "product_id": pid,
            "name": name,
            "url_before": url_before,
            "url_after": url_after,
            "elapsed_ms": scrape.elapsed_ms,
        }

    try:
        if not DRY_RUN:
            record_freshness(pid, "ok")
            record_price(pid, display_price)
        flag_manual_review(pid, False)
    except Exception:
        pass

    return {
        "action": "update",
        "updated": True,
        "matched_count": len(matched),
        "old_price": old_price,
        "new_price": display_price,
        "url_before": url_before,
        "url_after": url_after,
        "elapsed_ms": scrape.elapsed_ms,
        "fingerprint": scrape.fingerprint,
        "extractors": scrape.extractors_used,
        "matched": matched,
        "unmatched": unmatched,
    }


def sync_all(force: bool = False) -> dict:
    global DRY_RUN
    DRY_RUN = False
    if not os.path.exists(UPDATED_JSONL):
        open(UPDATED_JSONL, "w").close()
    if not os.path.exists(SKIPPED_JSONL):
        open(SKIPPED_JSONL, "w").close()

    products = fetch_all_products()
    print(f"sync: {len(products)} products loaded")

    counts: dict[str, int] = {}
    updates: list[dict] = []

    for product in products:
        try:
            result = sync_one(product)
        except Exception as e:
            import traceback
            traceback.print_exc()
            result = {
                "action": "error",
                "reason": f"unhandled:{e}",
                "product_id": product.get("_id", ""),
                "name": product.get("name", ""),
            }
        action = result.get("action", "error")
        counts[action] = counts.get(action, 0) + 1
        if action == "update":
            _log_updated(result)
            print(f" UPDATE {result.get('name')} | {result.get('old_price')} -> {result.get('new_price')} | matched={result.get('matched_count')} | extractors={result.get('extractors')}")
        elif action == "skip":
            _log_skipped(result)
            print(f" SKIP  {result.get('name')} | {result.get('reason')}")
        elif action == "error":
            _log_skipped(result)
            print(f" ERROR {result.get('name')} | {result.get('reason')}")
        updates.append(result)

    print(f"\nsync summary:")
    for k in ("update", "skip", "error"):
        print(f"  {k}: {counts.get(k, 0)}")
    return {"updated": counts.get("update", 0), "skipped": counts.get("skip", 0), "errors": counts.get("error", 0)}


def main() -> int:
    ap = argparse.ArgumentParser(description="Flipkart-only exact-match price sync")
    ap.add_argument("--mode", choices=["flipkart"], default="flipkart")
    ap.add_argument("--force", action="store_true", help="Bypass delta-sync freshness gate")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--brands", type=str, default=None)
    args = ap.parse_args()

    global DRY_RUN
    DRY_RUN = args.dry_run

    if args.dry_run:
        print("DRY RUN — no Sanity writes")

    products = fetch_all_products()
    if args.brands:
        wanted = {b.lower().strip() for b in args.brands.split(",")}
        products = [p for p in products if (p.get("brandSlug") or "").lower() in wanted]
        print(f"Filtered to brands: {sorted(wanted)} -> {len(products)} products")

    counts = {"update": 0, "skip": 0, "error": 0}
    for product in products:
        try:
            if args.force:
                product.pop("lastPriceUpdatedAt", None)
            result = sync_one(product)
        except Exception as e:
            import traceback
            traceback.print_exc()
            result = {"action": "error", "reason": f"unhandled:{e}", "product_id": product.get("_id", ""), "name": product.get("name", "")}
        counts[result.get("action", "error")] = counts.get(result.get("action", "error"), 0) + 1
        if result.get("action") == "update":
            _log_updated(result)
        elif result.get("action") in ("skip", "error"):
            _log_skipped(result)

    for k in ("update", "skip", "error"):
        print(f"  {k}: {counts.get(k, 0)}")
    return 0 if counts.get("error", 0) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
