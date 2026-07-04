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


FLIPKART_BRANDS = ["Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing", "Narzo", "Google", "Infinix"]
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

    print(f"Found {len(products)} products in Sanity")
    checked = 0
    skipped_no_url = 0
    skipped_no_price = 0
    matched = 0

    for product in products:
        source = get_assigned_source(product)
        brand = (product.get("brand") or {}).get("name", "")
        if source is None:
            continue

        flipkart_url = product.get("flipkartUrl")
        amazon_url = product.get("amazonUrl")
        old_price = product.get("price")

        checked += 1
        amz_price = None
        flip_price = None
        display_price = None

        if source == "flipkart":
            if not flipkart_url:
                skipped_no_url += 1
                print(f"  SKIP {product['name']}: no flipkartUrl")
                continue
            flip_price = get_flipkart_price(flipkart_url)
            display_price = flip_price
        elif source == "amazon":
            if not amazon_url:
                skipped_no_url += 1
                print(f"  SKIP {product['name']}: no amazonUrl")
                continue
            amz_price = get_amazon_price(amazon_url)
            display_price = amz_price
        elif source == "both":
            flip_price = get_flipkart_price(flipkart_url) if flipkart_url else None
            amz_price = get_amazon_price(amazon_url) if amazon_url else None
            prices = [p for p in [amz_price, flip_price] if p is not None]
            if not prices:
                print(f"  SKIP {product['name']}: both scrapers returned None")
                skipped_no_price += 1
                continue
            display_price = min(prices)

        if display_price is None:
            print(f"  SKIP {product['name']}: scraper returned None (old={old_price})")
            skipped_no_price += 1
            continue

        if old_price == display_price:
            matched += 1
            print(f"  = {product['name']} ({brand}): ₹{old_price} (unchanged)")
            continue

        update_price(product["_id"], amz_price, flip_price, display_price)
        updated_count += 1
        diff = display_price - (old_price or 0)
        arrow = "↑" if diff > 0 else "↓"
        log_change(product["name"], brand, old_price, display_price, source)
        print(f"  {arrow} {product['name']} ({brand}): ₹{old_price} → ₹{display_price} ({'+' if diff > 0 else ''}{diff}) via {source}")

    print(f"✓ Checked {checked} phones. Updated {updated_count}. Matched {matched}. No URL: {skipped_no_url}. Scrape failed: {skipped_no_price}.")

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
