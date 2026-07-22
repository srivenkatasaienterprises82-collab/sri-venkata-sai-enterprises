"""Batch patch all variant prices in Sanity using batched mutations.

This is more robust than the per-product approach because it:
1. Fetches ALL product IDs in one query first
2. Patches in batches of 5 using a single mutation request
3. Has aggressive retry with exponential backoff for connection resets
"""
import json
import os
import sys
import time

import requests

PROJECT_ID = os.getenv("SANITY_PROJECT_ID", "homvjne9")
DATASET = os.getenv("SANITY_DATASET", "production")
TOKEN = os.getenv("SANITY_TOKEN")
if not TOKEN:
    print("ERROR: SANITY_TOKEN env var is required")
    sys.exit(2)

BASE = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01"
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


def api_get(path, params=None, retries=5):
    url = f"{BASE}{path}"
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, headers=HEADERS, params=params, timeout=60)
            r.raise_for_status()
            return r.json()
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            if attempt < retries:
                wait = min(2 ** attempt, 20)
                print(f"  [retry {attempt}/{retries}] GET {path} failed: {e}")
                print(f"  Waiting {wait}s...")
                time.sleep(wait)
            else:
                raise


def api_mutate(mutations, retries=3):
    url = f"{BASE}/data/mutate/{DATASET}"
    for attempt in range(1, retries + 1):
        try:
            r = requests.post(url, headers=HEADERS, json={"mutations": mutations}, timeout=60)
            if r.status_code == 200 or r.status_code == 201:
                return r.json()
            if r.status_code in (429, 500, 502, 503, 504):
                if attempt < retries:
                    wait = min(2 ** attempt, 15)
                    print(f"  [retry {attempt}/{retries}] POST failed HTTP {r.status_code}")
                    time.sleep(wait)
                    continue
            r.raise_for_status()
        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            if attempt < retries:
                wait = min(2 ** attempt, 15)
                print(f"  [retry {attempt}/{retries}] POST connection error: {e}")
                time.sleep(wait)
            else:
                raise


def main():
    spec_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "variant-price-spec.json"
    )
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = json.load(f)

    # Step 1: Fetch ALL product IDs in one query
    all_slugs = list(spec.keys())
    print(f"Fetching product IDs for {len(all_slugs)} products...")

    query = f'*[_type=="product" && slug.current in {json.dumps(all_slugs)}][0...{len(all_slugs)}]{{_id, "slug": slug.current, "variants": variants}}'
    result = api_get("/data/query/" + DATASET, params={"query": query})

    rows = result.get("result", [])
    slug_map = {r.get("slug"): r for r in rows if r.get("slug")}
    print(f"Found {len(slug_map)}/{len(all_slugs)} products in Sanity")

    # Step 2: Build batches of mutations
    all_mutations = []
    for slug, spec_variants in spec.items():
        doc = slug_map.get(slug)
        if not doc:
            print(f"  SKIP {slug}: not found in Sanity")
            continue

        existing = doc.get("variants") or []
        desired = {}
        for sv in spec_variants:
            desired[(_norm(sv.get("ram")), _norm(sv.get("storage")))] = sv

        updated = []
        changed = 0
        for v in existing:
            key = (_norm(v.get("ram")), _norm(v.get("storage")))
            sv = desired.get(key)
            nv = dict(v)
            if sv:
                if isinstance(sv.get("price"), (int, float)) and sv["price"] > 0:
                    nv["price"] = int(sv["price"])
                if isinstance(sv.get("flipkartPrice"), (int, float)) and sv["flipkartPrice"] > 0:
                    nv["flipkartPrice"] = int(sv["flipkartPrice"])
                changed += 1
                desired.pop(key, None)
            updated.append(nv)

        # Append new variants not already in Sanity
        for key, sv in desired.items():
            nv = {"ram": sv.get("ram"), "storage": sv.get("storage")}
            if isinstance(sv.get("price"), (int, float)) and sv["price"] > 0:
                nv["price"] = int(sv["price"])
            if isinstance(sv.get("flipkartPrice"), (int, float)) and sv["flipkartPrice"] > 0:
                nv["flipkartPrice"] = int(sv["flipkartPrice"])
            updated.append(nv)
            changed += 1
            print(f"    ADDED {slug}: ({sv.get('ram')},{sv.get('storage')})")

        if changed == 0:
            print(f"  SKIP {slug}: no variant matched the spec")
            continue

        # Build set_fields
        fk_prices = [
            v.get("flipkartPrice") for v in updated
            if isinstance(v.get("flipkartPrice"), (int, float)) and v["flipkartPrice"] > 0
        ]
        set_fields = {"variants": updated}
        if fk_prices:
            min_fk = int(min(fk_prices))
            set_fields["flipkartPrice"] = min_fk
            set_fields["price"] = min_fk

        all_mutations.append({
            "patch": {"id": doc["_id"], "set": set_fields}
        })

    print(f"\nTotal mutations to apply: {len(all_mutations)}")

    # Step 3: Apply in batches of 5
    BATCH_SIZE = 5
    applied = 0
    for i in range(0, len(all_mutations), BATCH_SIZE):
        batch = all_mutations[i:i + BATCH_SIZE]
        # Build slug list for logging
        batch_slugs = []
        for m in batch:
            pid = m["patch"]["id"]
            for slug, doc in slug_map.items():
                if doc["_id"] == pid:
                    batch_slugs.append(slug)
                    break

        try:
            result = api_mutate(batch)
            applied += len(batch)
            print(f"  OK batch {i//BATCH_SIZE + 1}: {', '.join(batch_slugs)}")
        except Exception as e:
            print(f"  ERROR batch {i//BATCH_SIZE + 1} ({', '.join(batch_slugs)}): {e}")
            # Retry individually
            for m in batch:
                try:
                    api_mutate([m])
                    applied += 1
                    print(f"    OK single: {m['patch']['id']}")
                except Exception as e2:
                    print(f"    FAILED: {m['patch']['id']}: {e2}")

        time.sleep(0.5)  # small delay between batches

    print(f"\nDone. Applied {applied}/{len(all_mutations)} mutations.")


if __name__ == "__main__":
    main()
