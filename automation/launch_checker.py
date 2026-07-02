import argparse
import os
from sanity_api import fetch_all_products, update_price, create_product
from amazon import get_amazon_price
from flipkart import get_flipkart_price
from utils import is_match
from groq_ai import normalize_and_describe


FLIPKART_BRANDS = ["Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing"]
AMAZON_BRANDS = ["iQOO", "Redmi"]


def sync_prices():
    print("Starting Price Sync...")
    products = fetch_all_products()
    updated_count = 0

    for product in products:
        amz_price = get_amazon_price(product.get("amazonUrl"))
        flip_price = get_flipkart_price(product.get("flipkartUrl"))

        prices = [p for p in [amz_price, flip_price] if p is not None]
        if not prices:
            continue

        display_price = min(prices)

        if product.get("price") != display_price:
            update_price(product["_id"], amz_price, flip_price, display_price)
            updated_count += 1
            print(f"Updated {product['name']}: ₹{display_price}")

    print(f"✓ Checked {len(products)} phones. Updated {updated_count} prices.")


def check_launches():
    print("Checking for new launches...")
    existing_products = fetch_all_products()
    existing_titles = [p["name"] for p in existing_products]

    scraped_phones = [
        {"raw_name": "Redmi Note 13 Pro 5G (256GB+8GB) Purple", "brand": "Redmi"},
        {"raw_name": "Motorola Edge 50 Pro", "brand": "Motorola"},
    ]

    added_count = 0
    for phone in scraped_phones:
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
