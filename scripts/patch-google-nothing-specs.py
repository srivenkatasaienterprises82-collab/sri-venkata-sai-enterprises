#!/usr/bin/env python3
"""Patch Google Pixel and Nothing Phone specs in Sanity."""
import os, sys, requests, time
from dotenv import load_dotenv
load_dotenv(".env.local")

PROJECT_ID = os.getenv("NEXT_PUBLIC_SANITY_PROJECT_ID") or os.getenv("SANITY_PROJECT_ID")
DATASET = os.getenv("SANITY_DATASET") or "production"
TOKEN = os.getenv("SANITY_TOKEN")
if not PROJECT_ID or not TOKEN:
    print("ERROR: Missing Sanity credentials")
    sys.exit(1)

BASE_URL = "https://%s.api.sanity.io/v2024-01-01" % PROJECT_ID
HEADERS = {"Authorization": "Bearer %s" % TOKEN, "Content-Type": "application/json"}

DRY_RUN = "--dry-run" in sys.argv

NEW_SPECS = {
    "pixel-10": [
        {"label": "Display", "value": '6.3" OLED, FHD+, 120Hz'},
        {"label": "Processor", "value": "Google Tensor G5"},
        {"label": "Camera", "value": "48MP + 13MP Ultra-wide + 10.8MP Telephoto (5x)"},
        {"label": "Selfie Camera", "value": "10.5MP"},
        {"label": "Battery", "value": "4970mAh"},
        {"label": "Charging", "value": "30W wired, 15W wireless"},
        {"label": "OS", "value": "Android 16 (7 years updates)"},
    ],
    "pixel-10a": [
        {"label": "Display", "value": '6.3" P-OLED, FHD+, 120Hz'},
        {"label": "Processor", "value": "Google Tensor G4"},
        {"label": "Camera", "value": "48MP OIS + 13MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "5100mAh"},
        {"label": "Charging", "value": "30W wired"},
        {"label": "OS", "value": "Android 16"},
    ],
    "nothing-phone-4a-pro": [
        {"label": "Display", "value": '6.83" AMOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 7 Gen 4"},
        {"label": "Camera", "value": "50MP Sony LYT700C OIS + 50MP Periscope (3.5x) + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5400mAh"},
        {"label": "Charging", "value": "50W"},
        {"label": "OS", "value": "Nothing OS 4.1 (Android 16)"},
    ],
    "nothing-phone-4a": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7s Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 50MP Periscope (3.5x) + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5400mAh"},
        {"label": "Charging", "value": "50W"},
        {"label": "OS", "value": "Nothing OS 4.1 (Android 16)"},
    ],
}

def query(groq):
    url = "%s/data/query/%s?query=%s" % (BASE_URL, DATASET, requests.utils.quote(groq))
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return res.json().get("result", []) or []
    return []

products = query('*[_type == "product"]{_id, name, "slug": slug.current}')
print("Found %d products in Sanity" % len(products))

slug_map = {}
for p in products:
    s = p.get("slug", "")
    if s:
        slug_map[s] = p

for slug, specs in sorted(NEW_SPECS.items()):
    product = slug_map.get(slug)
    if not product:
        print("  SKIP %s - not found in Sanity" % slug)
        continue
    if DRY_RUN:
        print("  [DRY-RUN] WOULD UPDATE: %s (%s)" % (product.get("name",""), slug))
        continue
    mutations = {"mutations": [{"patch": {"id": product["_id"], "set": {"specifications": specs}}}]}
    url = "%s/data/mutate/%s" % (BASE_URL, DATASET)
    res = requests.post(url, headers=HEADERS, json=mutations)
    if res.status_code in (200, 201):
        print("  [OK] Updated: %s (%s)" % (product.get("name",""), slug))
    else:
        print("  [FAIL] %s - HTTP %d: %s" % (slug, res.status_code, res.text[:100]))
    time.sleep(0.25)

print("\nDone!")
