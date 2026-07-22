"""One-off targeted patch: correct per-variant prices in Sanity.

Reads a JSON mapping of {slug: [{ram, storage, price, flipkartPrice}, ...]}
and patches ONLY the matched variants' `price` / `flipkartPrice` fields,
leaving every other field (colors, product-level flipkartPrice, images,
etc.) untouched. This preserves live-synced data while fixing stale seed
variant prices.

Usage:
    SANITY_TOKEN=<write-token> python automation/patch_variant_prices.py spec.json

The spec JSON lives in the repo at automation/variant-price-spec.json so it
can be reviewed/committed. Run via the `variant-price-fix` workflow on manual
dispatch (which supplies SANITY_TOKEN from secrets).
"""
import json
import os
import sys
import time

import requests

PROJECT_ID = os.getenv("SANITY_PROJECT_ID", "homvjne9")
DATASET = os.getenv("SANITY_DATASET", "production")
TOKEN = os.getenv("SANITY_TOKEN")
API_VERSION = "v2023-05-03"

if not TOKEN:
    print("ERROR: SANITY_TOKEN env var is required (write token).")
    sys.exit(2)

BASE = f"https://{PROJECT_ID}.api.sanity.io/{API_VERSION}"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def _norm(value):
    if not value:
        return ""
    s = str(value).lower().strip()
    s = s.replace(" ", "").replace("gb", "").replace("ram", "").replace("rom", "")
    return s


def fetch_doc(slug):
    url = f"{BASE}/data/query/{DATASET}"
    q = f'*[_type=="product" && slug.current=="{slug}" && enabled!=false][0]{{_id, "variants": variants}}'
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            r = requests.get(url, headers=HEADERS, params={"query": q}, timeout=30)
            r.raise_for_status()
            return r.json().get("result")
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt < max_retries:
                wait = min(2 ** attempt, 15)
                print(f"    Retry {attempt}/{max_retries} after {wait}s: {e}")
                time.sleep(wait)
            else:
                raise


def patch_variants(slug, spec_variants):
    doc = fetch_doc(slug)
    if not doc:
        print(f"  SKIP {slug}: not found in Sanity")
        return False
    existing = doc.get("variants") or []

    # Build lookup of desired per (ram, storage)
    desired = {}
    for sv in spec_variants:
        desired[(_norm(sv.get("ram")), _norm(sv.get("storage")))] = sv

    updated = []
    changed = 0
    for v in existing:
        key = (_norm(v.get("ram")), _norm(v.get("storage")))
        spec = desired.get(key)
        nv = dict(v)
        if spec:
            if isinstance(spec.get("price"), (int, float)) and spec["price"] > 0:
                nv["price"] = int(spec["price"])
            if isinstance(spec.get("flipkartPrice"), (int, float)) and spec["flipkartPrice"] > 0:
                nv["flipkartPrice"] = int(spec["flipkartPrice"])
            changed += 1
            desired.pop(key, None)  # consumed; any leftovers are NEW tiers
        updated.append(nv)

    # Append any spec variants not already present in Sanity (new tiers).
    for key, spec in desired.items():
        nv = {"ram": spec.get("ram"), "storage": spec.get("storage")}
        if isinstance(spec.get("price"), (int, float)) and spec["price"] > 0:
            nv["price"] = int(spec["price"])
        if isinstance(spec.get("flipkartPrice"), (int, float)) and spec["flipkartPrice"] > 0:
            nv["flipkartPrice"] = int(spec["flipkartPrice"])
        updated.append(nv)
        changed += 1
        print(f"    ADDED {slug}: ({spec.get('ram')},{spec.get('storage')})")

    if changed == 0:
        print(f"  SKIP {slug}: no variant matched the spec")
        return False

    # Also correct the product-level marketplace price so cards / meta title
    # reflect the verified minimum tier (the 6h cron may have collapsed it to
    # a single scraped value). Use the cheapest verified variant's price.
    fk_prices = [
        v.get("flipkartPrice") for v in updated
        if isinstance(v.get("flipkartPrice"), (int, float)) and v["flipkartPrice"] > 0
    ]
    set_fields = {"variants": updated}
    if fk_prices:
        min_fk = int(min(fk_prices))
        set_fields["flipkartPrice"] = min_fk
        set_fields["price"] = min_fk

    mutation = {
        "mutations": [
            {"patch": {"id": doc["_id"], "set": set_fields}}
        ]
    }
    r = requests.post(f"{BASE}/data/mutate/{DATASET}", headers=HEADERS, json=mutation, timeout=30)
    r.raise_for_status()
    print(f"  OK   {slug}: patched {changed} variant(s)")
    return True


def main():
    spec_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "variant-price-spec.json"
    )
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = json.load(f)

    ok = 0
    for idx, (slug, variants) in enumerate(spec.items()):
        print(f"Patching {slug} ...")
        if patch_variants(slug, variants):
            ok += 1
        # Small delay between patches to avoid Sanity API rate limits
        if idx < len(spec) - 1:
            time.sleep(1)
    print(f"\nDone. Patched {ok}/{len(spec)} products.")


if __name__ == "__main__":
    main()
