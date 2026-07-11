import sys, os
from dotenv import load_dotenv
load_dotenv("C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/.env.local")
sys.path.insert(0, "C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/src")
from automation.sanity_api import fetch_all_products
from automation.flipkart import get_flipkart_price
from automation.amazon import get_amazon_price

BRANDS = {"Samsung", "iQOO", "Apple", "OnePlus", "Motorola", "Vivo", "Realme", "Redmi", "POCO", "Oppo", "Google"}
rows = []
for p in fetch_all_products():
    b = (p.get("brand") or {}).get("name", "")
    if b not in BRANDS:
        continue
    rows.append({
        "id": p["_id"],
        "name": p["name"],
        "brand": b,
        "stored_price": p.get("price"),
        "amz_price": p.get("amazonPrice"),
        "fk_price": p.get("flipkartPrice"),
        "fk_url": p.get("flipkartUrl"),
        "az_url": p.get("amazonUrl"),
    })

print(f"Popular brand products in Sanity: {len(rows)}")
for row in rows[:12]:
    print(f"{row['brand']:10} | {row['name'][:40]:40} | stored={row['stored_price']} | amz={row['amz_price']} | fk={row['fk_price']}")
