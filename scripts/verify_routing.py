"""Local verification of the routing logic in launch_checker.

We stub every external boundary (Sanity fetch, scrapers, mutation) so this
is fully offline. We only want to prove:

  1. get_assigned_source() routes by brand *slug* (case-insensitive), so
     "POCO" (stored uppercase) and "narzo" now reach a scraper.
  2. sync_prices() actually reaches the update path for a POCO product
     (it previously silently skipped all POCO because the old code
     matched the display name "Poco" which never appeared).

Run: python scripts/verify_routing.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "automation"))

import automation.launch_checker as LC  # noqa: E402


# --- 1. Direct unit check of get_assigned_source over every known brand ---
def make_product(brand_name, brand_slug, **extra):
    p = {
        "_id": f"product-{brand_slug}-x",
        "name": f"{brand_name} Test X",
        "slug": {"current": f"{brand_slug}-x"},
        "brand": {"name": brand_name, "slug": brand_slug},
        "enabled": True,
        "priceLocked": False,
        "amazonUrl": "https://www.amazon.in/dp/TEST",
        "flipkartUrl": "https://www.flipkart.com/test/p/itmTEST",
    }
    p.update(extra)
    return p


cases = [
    ("Motorola", "motorola", "flipkart"),
    ("Oppo", "oppo", "flipkart"),
    ("Vivo", "vivo", "flipkart"),
    ("Realme", "realme", "flipkart"),
    ("POCO", "poco", "flipkart"),          # was the previously-skipped brand
    ("Poco", "poco", "flipkart"),          # alternate casing of display name
    ("Nothing", "nothing", "flipkart"),
    ("Apple", "apple", "both"),
    ("Samsung", "samsung", "both"),
    ("OnePlus", "oneplus", "both"),
    ("Narzo", "narzo", "flipkart"),         # newly added brand
    ("iQOO", "iqoo", "amazon"),
    ("Redmi", "redmi", "amazon"),
    ("Lava", "lava", "none"),               # unsupported -> no source
]

print("== get_assigned_source by brand slug ==")
all_ok = True
for brand_name, slug, expect in cases:
    p = make_product(brand_name, slug)
    got = LC.get_assigned_source(p)
    ok = (got == expect) or (expect == "none" and got is None)
    all_ok = all_ok and ok
    print(f"  {brand_name:<8} slug={slug:<8} -> {str(got):<10} expect={expect:<8} {'OK' if ok else 'FAIL'}")

print()

# --- 2. Full sync_prices loop reaches the POCO product (stubbed boundaries) ---
routed = []
LC.url_name_matches = lambda n, u: True  # exercise the routing path fully


def fake_flipkart(url):
    return 19999


def fake_amazon(url):
    return 19999


def fake_update(pid, ap, fp, dp):
    routed.append(pid)
    return {"results": [{"id": pid}]}


def fake_log(*a, **k):
    pass


def fake_fetch_all():
    return [
        make_product("POCO", "poco"),
        make_product("Narzo", "narzo"),
        make_product("Motorola", "motorola"),
        make_product("Apple", "apple"),
        make_product("Lava", "lava"),                       # unsupported -> skipped
        make_product("Realme", "realme", enabled=False),    # draft -> skipped
        make_product("iQOO", "iqoo", priceLocked=True),     # locked -> skipped
    ]


LC.get_flipkart_price = fake_flipkart
LC.get_amazon_price = fake_amazon
LC.update_price = fake_update
LC.log_change = fake_log
LC.fetch_all_products = fake_fetch_all

LC.sync_prices()

print("== sync_prices routing with stubbed boundaries ==")
print(f"  products the scraper+update path was reached for ({len(routed)}):")
for pid in routed:
    print(f"    - {pid}")

poco_reached = any("poco" in pid for pid in routed)
narzo_reached = any("narzo" in pid for pid in routed)
lava_skipped = not any("lava" in pid for pid in routed)
draft_skipped = not any("realme" in pid for pid in routed)
locked_skipped = not any("iqoo" in pid for pid in routed)

print()
print("== verdict ==")
checks = [
    ("POCO now routed (was silently skipped before)", poco_reached),
    ("Narzo routed (newly added)", narzo_reached),
    ("Unsupported Lava skipped", lava_skipped),
    ("Draft Realme skipped", draft_skipped),
    ("Locked iQOO skipped", locked_skipped),
    ("get_assigned_source mapping correct", all_ok),
]
all_pass = True
for label, ok in checks:
    all_pass = all_pass and ok
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
print()
print("ALL CHECKS PASS" if all_pass else "SOME CHECKS FAILED")
sys.exit(0 if all_pass else 1)
