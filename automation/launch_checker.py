import argparse
import os
from datetime import datetime
from sanity_api import fetch_all_products, update_price, create_product
from amazon import get_amazon_price
from flipkart import get_flipkart_price
from utils import is_match
from groq_ai import normalize_and_describe

LOG_FILE = "price-changes.csv"


def log_change(product_name, brand, old_price, new_price, source):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diff = new_price - (old_price or 0)
    arrow = "UP" if diff > 0 else "DOWN"
    line = f"{now},{product_name},{brand},{old_price},{new_price},{diff},{arrow},{source}"
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


FLIPKART_BRANDS = ["Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing"]
AMAZON_BRANDS = ["iQOO", "Redmi"]
BOTH_BRANDS = ["Apple", "Samsung", "OnePlus"]


def get_assigned_source(product: dict) -> str | None:
    brand = (product.get("brand") or {}).get("name", "")
    if brand in FLIPKART_BRANDS:
        return "flipkart"
    if brand in AMAZON_BRANDS:
        return "amazon"
    if brand in BOTH_BRANDS:
        return "both"
    return None


def sync_prices():
    print("Starting Price Sync...")
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w") as f:
            f.write("timestamp,product,brand,old_price,new_price,diff,direction,source\n")
    products = fetch_all_products()
    updated_count = 0

    for product in products:
        source = get_assigned_source(product)
        if source is None:
            continue

        old_price = product.get("price")
        amz_price = None
        flip_price = None
        display_price = None

        if source == "flipkart":
            flip_price = get_flipkart_price(product.get("flipkartUrl"))
            display_price = flip_price
        elif source == "amazon":
            amz_price = get_amazon_price(product.get("amazonUrl"))
            display_price = amz_price
        elif source == "both":
            flip_price = get_flipkart_price(product.get("flipkartUrl"))
            amz_price = get_amazon_price(product.get("amazonUrl"))
            prices = [p for p in [amz_price, flip_price] if p is not None]
            if not prices:
                continue
            display_price = min(prices)

        if display_price is None:
            continue

        if old_price != display_price:
            update_price(product["_id"], amz_price, flip_price, display_price)
            updated_count += 1
            brand = (product.get("brand") or {}).get("name", "")
            diff = display_price - (old_price or 0)
            arrow = "↑" if diff > 0 else "↓"
            log_change(product["name"], brand, old_price, display_price, source)
            print(f"{arrow} {product['name']} ({brand}): ₹{old_price} → ₹{display_price} ({'+' if diff > 0 else ''}{diff}) via {source}")

    print(f"✓ Checked {len(products)} phones. Updated {updated_count} prices.")


TRACKED_BRANDS = FLIPKART_BRANDS + AMAZON_BRANDS + BOTH_BRANDS


def check_launches():
    print("Checking for new launches...")
    existing_products = fetch_all_products()
    existing_titles = [p["name"] for p in existing_products]

    scraped_phones = []

    added_count = 0
    for phone in scraped_phones:
        if phone["brand"] not in TRACKED_BRANDS:
            continue
        ai_data = normalize_and_describe(phone["raw_name"], phone["brand"])
        clean_title = ai_data.get("title", phone["raw_name"])

        is_already_added = any(is_match(clean_title, exist) for exist in existing_titles)
        if not is_already_added:
            print(f"Found new phone: {clean_title}")
            phone["amazonUrl"] = "https://amazon.in/dp/XXXX"
            phone["flipkartUrl"] = "https://flipkart.com/product/XXXX"
            phone.update(ai_data)
            create_product(phone)
            added_count += 1

    print(f"✓ Added {added_count} new phones.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str, required=True, choices=["sync", "launch"])
    args = parser.parse_args()
    if args.mode == "sync":
        sync_prices()
    elif args.mode == "launch":
        check_launches()
