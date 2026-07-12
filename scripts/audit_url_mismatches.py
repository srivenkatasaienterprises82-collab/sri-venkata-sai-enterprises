"""Audit-only script: lists Sanity products whose stored Flipkart/Amazon URL
appears to point at a different product. Not part of the runtime — just a
one-shot we can run to surface the data-quality issues the price sync can't
fix (those need to be corrected in the Studio, not by the scraper).

Run: python scripts/audit_url_mismatches.py
"""
import os
import re
import sys

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "automation"))

from automation.utils import url_name_matches

PROJECT = "homvjne9"
DATASET = "production"


def _read_env_var(key, default=None):
    env_path = os.path.join(ROOT, ".env.local")
    if not os.path.exists(env_path):
        return default
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            m = re.match(rf"^\s*{key}\s*=\s*(.+?)\s*$", line)
            if m:
                return m.group(1).strip().strip('"').strip("'")
    return default


def main():
    token = _read_env_var("SANITY_API_READ_TOKEN")
    if not token:
        print("No SANITY_API_READ_TOKEN in .env.local — exiting.")
        return
    q = ('*[_type=="product"]{_id, name, slug, "brand": brand->name, '
         '"brandSlug": brand->slug.current, amazonUrl, flipkartUrl, price, '
         'priceLocked}'
         ' | order(brand asc, name asc)')
    url = (
        f"https://{PROJECT}.api.sanity.io/v2024-01-01/data/query/{DATASET}"
        f"?query={requests.utils.quote(q)}"
    )
    resp = requests.get(
        url, headers={"Authorization": f"Bearer {token}"}, timeout=30
    )
    resp.raise_for_status()
    products = resp.json().get("result", [])
    mismatches = []
    no_url = []
    for p in products:
        if not p.get("flipkartUrl") and not p.get("amazonUrl"):
            no_url.append(p)
            continue
        url_to_check = p.get("flipkartUrl") or p.get("amazonUrl")
        if not url_name_matches(p.get("name", ""), url_to_check):
            mismatches.append(p)

    print(f"\n=== URL mismatch audit: {len(mismatches)} flagged products ===")
    for m in mismatches:
        url_to_show = m.get("flipkartUrl") or m.get("amazonUrl")
        print(
            f"{(m.get('brand') or ''):>12} | "
            f"{m.get('name',''):>32} | "
            f"price={m.get('price')!s:>7} | "
            f"{url_to_show[:120]}"
        )
    if no_url:
        print(f"\n=== Products with NO url at all: {len(no_url)} ===")
        for m in no_url:
            print(f"  {m.get('name')} ({m.get('brand')})")


if __name__ == "__main__":
    main()
