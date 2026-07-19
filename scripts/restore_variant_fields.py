"""Restore ram/storage/colors on Sanity product variants from the static
source of truth (src/lib/data/products.ts), while PRESERVING the live scraped
prices (flipkartPrice / amazonPrice / price) that the 6h sync wrote.

This repairs the regression where some products' Sanity variants lost their
ram/storage (so the PDP variant selector rendered no buttons and the price
never changed on click). It is a targeted merge, NOT a full re-seed, so live
Flipkart/Amazon prices are kept.
"""
import json
import re
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "automation"))

from sanity_api import fetch_all_products, _mutate

STATIC_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "data", "products.ts")


def _extract_static_variants():
    """Return {slug: [ {ram, storage, price, originalPrice}, ... ]} parsed from
    products.ts. Regex-based but robust enough for the well-formed variant
    literals in that file."""
    text = open(STATIC_PATH, encoding="utf-8", errors="replace").read()
    # Each product: slug: "x" ... variants: [ {...}, {...} ]
    out = {}
    # Split into product blocks by the `slug: "..."` anchor.
    blocks = re.split(r'slug:\s*"', text)[1:]
    for b in blocks:
        slug = b.split('"', 1)[0]
        # find the variants array for THIS block up to the next `specifications`
        vm = re.search(r"variants:\s*\[(.*?)\]", b, re.S)
        if not vm:
            continue
        arr = vm.group(1)
        variants = []
        for vmatch in re.finditer(
            r"\{\s*ram:\s*\"([^\"]*)\",\s*storage:\s*\"([^\"]*)\",\s*price:\s*(\d+),?\s*originalPrice:\s*(\d*)",
            arr,
        ):
            ram, storage, price, orig = vmatch.groups()
            variants.append({
                "ram": ram or None,
                "storage": storage or None,
                "price": int(price),
                "originalPrice": int(orig) if orig else None,
            })
        if variants:
            out[slug] = variants
    return out


def main():
    static = _extract_static_variants()
    products = fetch_all_products()
    patched = 0
    for p in products:
        slug = (p.get("slug") or {}).get("current") if isinstance(p.get("slug"), dict) else p.get("slug")
        if not slug or slug not in static:
            continue
        san_variants = p.get("variants") or []
        if not san_variants:
            continue
        static_variants = static[slug]
        # Match by price to align static (ram/storage) onto live (prices).
        # Build a price->static map (prices are unique enough within a product).
        price_to_static = {}
        for sv in static_variants:
            price_to_static.setdefault(sv["price"], sv)

        changed = False
        # Prefer ordered (index) alignment: Sanity variant[i] <-> static
        # variant[i]. This is far more reliable than price matching (scraped
        # prices drift away from static). Fall back to price matching only when
        # counts differ.
        use_index = len(static_variants) == len(san_variants)
        for i, v in enumerate(san_variants):
            if v.get("ram") and v.get("storage"):
                continue  # already has ram/storage; nothing to restore
            if use_index:
                match = static_variants[i]
            else:
                live_price = v.get("price")
                match = price_to_static.get(live_price)
                if not match and price_to_static:
                    match = min(price_to_static.values(),
                                key=lambda s: abs((s["price"] or 0) - (live_price or 0)))
            if match:
                v["ram"] = match["ram"]
                v["storage"] = match["storage"]
                if match.get("originalPrice") and not v.get("originalPrice"):
                    v["originalPrice"] = match["originalPrice"]
                changed = True
        if changed:
            mutation = {"mutations": [{"patch": {"id": p["_id"], "set": {"variants": san_variants}}}]}
            _mutate(mutation)
            patched += 1
            print(f"  patched {slug}: restored ram/storage on {len(san_variants)} variant(s)")
    print(f"Done. Patched {patched} product(s).")


if __name__ == "__main__":
    main()
