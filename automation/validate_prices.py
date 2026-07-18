"""Read current Sanity prices for a curated set of multi-variant products and
compare against the live (websearch-verified) prices captured on 2026-07-18.

This is a READ-ONLY diagnostic: it prints mismatches. It does NOT mutate
Sanity. Used to decide which products need a live re-scrape or a manual patch.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sanity_api import fetch_all_products

# Live prices verified via websearch on 2026-07-18 (Flipkart/Amazon IN).
# Each entry: slug -> dict of storage -> expected live price (INR).
LIVE = {
    "iphone-17": {
        "256 GB": 77900,   # base
        "512 GB": 97900,
    },
    "iqoo-15": {
        "256 GB": 76999,
        "512 GB": 83999,
    },
    "samsung-s26-plus": {
        "256 GB": 94999,
        "512 GB": 129999,
    },
    "vivo-v70-elite": {
        "256 GB": 51999,
    },
    "oneplus-13": {
        "256 GB": 59999,   # approximate verified base
    },
    "samsung-s25-ultra": {
        "256 GB": 90000,
        "512 GB": 105000,
    },
}


def _norm(s):
    return s.lower().replace(" ", "").replace("gb", "")


def main():
    products = fetch_all_products()
    by_slug = {p.get("slug", {}).get("current"): p for p in products}
    print(f"Read {len(products)} products from Sanity\n")
    for slug, live_variants in LIVE.items():
        p = by_slug.get(slug)
        if not p:
            print(f"[MISSING] {slug} not found in Sanity")
            continue
        print(f"=== {slug} ({p.get('name')}) ===")
        print(f"  top-level price: {p.get('price')}")
        variants = p.get("variants") or []
        sanity_by_storage = {}
        for v in variants:
            st = v.get("storage")
            if st:
                sanity_by_storage[_norm(st)] = v.get("price")
        for storage, live_price in live_variants.items():
            sn = sanity_by_storage.get(_norm(storage))
            status = "OK" if sn == live_price else "MISMATCH"
            print(f"  {storage}: sanity={sn}  live={live_price}  -> {status}")
        # also show any variants we don't have a live ref for
        for v in variants:
            if _norm(v.get("storage", "")) not in {_norm(k) for k in live_variants}:
                print(f"  {v.get('storage')}: sanity={v.get('price')}  (no live ref)")
        print()


if __name__ == "__main__":
    main()
