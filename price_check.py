import os, requests, json
from dotenv import load_dotenv
from automation.flipkart import get_flipkart_price
from automation.amazon import get_amazon_price

# NEVER hardcode a Sanity token. Load it from .env.local (local) or the
# SANITY_TOKEN environment variable (CI). If the token is missing the script
# must fail loudly rather than fall back to a committed secret.
load_dotenv()
TOKEN = os.getenv("SANITY_TOKEN")
if not TOKEN:
    raise SystemExit("SANITY_TOKEN is not set — export it or add it to .env.local")
BASE = "https://homvjne9.api.sanity.io/v2024-01-01"
HDR = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

BRANDS = {"Samsung", "iQOO", "Apple", "OnePlus", "Motorola", "Vivo", "Realme", "Redmi", "POCO", "Oppo", "Google"}
# Mirror the routing in automation/launch_checker.py: Apple/Samsung are
# Flipkart-only, iQOO/Redmi are Amazon-only, OnePlus/Google are scraped on
# both and the lower price wins. (Narzo/Infinix/POCO are covered by the
# FLIPKART_ONLY set below.)
FLIPKART_ONLY = {"Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing", "Narzo", "Google", "Infinix", "Apple", "Samsung"}
AMAZON_ONLY = {"iQOO", "Redmi"}
BOTH = {"OnePlus"}

def q(slug):
    r = requests.get(f"{BASE}/data/query/production?query={requests.utils.quote(slug)}", headers=HDR, timeout=15)
    r.raise_for_status()
    return r.json().get("result", [])

products = q('*[_type=="product"]{_id, name, "brand": brand->{name}, price, amazonPrice, flipkartPrice, amazonUrl, flipkartUrl}')
products = [p for p in products if (p.get("brand") or {}).get("name","") in BRANDS]
print(f"Popular-brand products: {len(products)}")

updated = 0; skipped = 0; unchanged = 0
for p in products:
    brand = (p.get("brand") or {}).get("name", "")
    fk_url = p.get("flipkartUrl"); az_url = p.get("amazonUrl")
    old_price = p.get("price"); fk_price = p.get("flipkartPrice"); az_price = p.get("amazonPrice")
    new_price = None

    if brand in FLIPKART_ONLY:
        if not fk_url:
            skipped += 1; continue
        new_price = get_flipkart_price(fk_url)
    elif brand in AMAZON_ONLY:
        if not az_url:
            skipped += 1; continue
        new_price = get_amazon_price(az_url)
    elif brand in BOTH:
        fk = get_flipkart_price(fk_url) if fk_url else None
        az = get_amazon_price(az_url) if az_url else None
        vals = [v for v in [fk, az] if v is not None]
        new_price = min(vals) if vals else None
    else:
        skipped += 1; continue

    if new_price is None:
        skipped += 1
        print(f"  SKIP {p['name']}: scraper None (fk={fk_price}, az={az_price})")
        continue

    if old_price == new_price:
        unchanged += 1
        print(f"  = {p['name']}: Rs.{old_price}")
        continue

    set_fields = {
        "price": new_price,
        "lastUpdated": __import__('datetime').datetime.now().isoformat(),
    }
    # Only overwrite the source-specific price we actually scraped; never
    # wipe the other marketplace's stored price with None.
    if brand in FLIPKART_ONLY:
        set_fields["flipkartPrice"] = new_price
    elif brand in AMAZON_ONLY:
        set_fields["amazonPrice"] = new_price
    elif brand in BOTH:
        if fk_price is not None:
            set_fields["flipkartPrice"] = fk_price
        if az_price is not None:
            set_fields["amazonPrice"] = az_price
    patch = {
        "mutations": [{"patch": {"id": p["_id"], "set": set_fields}}]
    }
    r = requests.post(f"{BASE}/data/mutate/production", headers=HDR, json=patch, timeout=15)
    if r.status_code == 200:
        print(f"  UPDATE {p['name']}: Rs.{old_price} -> Rs.{new_price}")
        updated += 1
    else:
        print(f"  FAIL {p['name']}: {r.status_code} {r.text[:120]}")
        skipped += 1

print(f"\nSummary: updated={updated} unchanged={unchanged} skipped={skipped}")
