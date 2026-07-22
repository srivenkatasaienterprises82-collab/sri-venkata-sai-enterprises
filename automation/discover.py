"""
New-phone launch discovery for Flipkart-routed brands.

Replaces launch_checker.py --mode launch with a cleaner, Flipkart-only flow.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

from automation.flipkart import get_flipkart_details
from automation.sanity_api import (
    fetch_all_products,
    fetch_existing_slugs,
    create_full_product,
)
from automation.utils import is_match, price_in_bounds, slugify
from automation.groq_ai import normalize_and_describe

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
OUT_JSONL = "new_launches.jsonl"
DRY_RUN = False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_jsonl(path: str, entry: dict) -> None:
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


def discover(dry_run: bool = False) -> int:
    global DRY_RUN
    DRY_RUN = dry_run
    if not os.path.exists(OUT_JSONL):
        open(OUT_JSONL, "w").close()

    products = fetch_all_products()
    existing_names = [p.get("name", "") for p in products]
    existing_slugs = fetch_existing_slugs()
    added = 0

    from automation.listing import get_brand_listings

    for brand_slug in FLIPKART_BRAND_SLUGS:
        try:
            listings = get_brand_listings(brand_slug, "flipkart")
        except Exception as e:
            print(f" discover: listing fetch failed for {brand_slug}: {e}")
            continue
        for name, url in listings:
            if any(is_match(name, ex) for ex in existing_names):
                continue
            try:
                details = get_flipkart_details(url)
            except Exception as e:
                print(f" discover: details fetch failed for {name}: {e}")
                continue
            price = details.get("price")
            if price is not None and not price_in_bounds(price):
                print(f" discover: SKIP {name} implausible price Rs{price}")
                continue
            normalized = normalize_and_describe(name, brand_slug)
            clean_name = normalized.get("title", name) or name
            slug = slugify(clean_name)
            base = slug
            i = 2
            while slug in existing_slugs:
                slug = f"{base}-{i}"
                i += 1
            entry = {
                "ts": _now_iso(),
                "brand_slug": brand_slug,
                "name": clean_name,
                "slug": slug,
                "url": url,
                "price": price,
                "status": "draft" if not dry_run else "dry_run",
            }
            _write_jsonl(OUT_JSONL, entry)
            if dry_run:
                print(f" [DRY RUN] would add: {clean_name} ({brand_slug})")
                added += 1
                continue
            res = create_full_product(clean_name, brand_slug, "flipkart", url, details)
            if res:
                existing_names.append(clean_name)
                existing_slugs.add(slug)
                added += 1
                print(f" + added draft: {clean_name} ({brand_slug})")
            else:
                print(f" SKIP {clean_name}: create_full_product returned None")

    print(f"discover: {added} new phone(s) found.")
    return added


def main() -> int:
    ap = argparse.ArgumentParser(description="New phone launch discovery (Flipkart-only)")
    ap.add_argument("--mode", choices=["launch"], default="launch")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    discover(dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
