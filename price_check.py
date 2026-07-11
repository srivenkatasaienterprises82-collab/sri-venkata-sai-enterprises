import os, requests, json
from dotenv import load_dotenv
from automation.flipkart import get_flipkart_price
from automation.amazon import get_amazon_price

load_dotenv("C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/.env.local")
TOKEN = "skB1QV0Fc0WB5752sNh4DE03AZ85FDo5kZcR6JH4gDJ5GPSU6DG4Y46JTB1xuqD6rH1TSLeHMRZJl4Ly6TA4eAoxoyCA0JnptpyYbhh1IFa3ZLPXzk3pFDKG7zteCQSn2VQ8v2uWDTfZhuEoEUe4ZZdVEIpRMDFeIeJJL7hCbeqNDoNpIEBb"
BASE = "https://homvjne9.api.sanity.io/v2024-01-01"
HDR = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

BRANDS = {"Samsung", "iQOO", "Apple", "OnePlus", "Motorola", "Vivo", "Realme", "Redmi", "POCO", "Oppo", "Google"}
FLIPKART_ONLY = {"Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing", "Narzo", "Google", "Infinix"}
AMAZON_ONLY = {"iQOO", "Redmi"}
BOTH = {"Apple", "Samsung", "OnePlus"}

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

    patch = {
        "mutations": [{"patch": {"id": p["_id"], "set": {
            "price": new_price,
            "amazonPrice": az_price if brand in BOTH else None,
            "flipkartPrice": fk_price if brand in BOTH else None,
            "lastUpdated": __import__('datetime').datetime.now().isoformat(),
        }}}]
    }
    r = requests.post(f"{BASE}/data/mutate/production", headers=HDR, json=patch, timeout=15)
    if r.status_code == 200:
        print(f"  UPDATE {p['name']}: Rs.{old_price} -> Rs.{new_price}")
        updated += 1
    else:
        print(f"  FAIL {p['name']}: {r.status_code} {r.text[:120]}")
        skipped += 1

print(f"\nSummary: updated={updated} unchanged={unchanged} skipped={skipped}")
