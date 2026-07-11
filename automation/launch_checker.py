import argparse
import os
from datetime import datetime
from sanity_api import fetch_all_products, update_price, create_full_product
from amazon import get_amazon_price, get_amazon_details
from flipkart import get_flipkart_price, get_flipkart_details
from listing import get_brand_listings
from utils import is_match

LOG_FILE = "price-changes.csv"


def log_change(product_name, brand, old_price, new_price, source):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diff = new_price - (old_price or 0)
    arrow = "UP" if diff > 0 else "DOWN"
    line = f"{now},{product_name},{brand},{old_price},{new_price},{diff},{arrow},{source}"
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


FLIPKART_BRANDS = ["Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing", "Apple", "Samsung", "OnePlus"]
AMAZON_BRANDS = ["iQOO", "Redmi"]
BOTH_BRANDS = []


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
        if product.get("priceLocked"):
            print(f"  SKIP {product['name']}: price locked (manual override)")
            continue

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

        # Plausibility guard: reject clearly-wrong prices (e.g. a variant or
        # accessory captured by mistake). Phones/accessories fall in this band.
        if display_price < 1000 or display_price > 250000:
            print(f"  SKIP {product['name']}: implausible price ₹{display_price} (skipped)")
            skipped_no_price += 1
            continue

        if old_price == display_price:
            matched += 1
            print(f"  = {product['name']} ({brand}): ₹{old_price} (unchanged)")
            continue

        update_price(product["_id"], amz_price, flip_price, display_price)
        updated_count += 1
        diff = display_price - (old_price or 0)
        arrow = "^" if diff > 0 else "v"
        log_change(product["name"], brand, old_price, display_price, source)
        print(f"  {arrow} {product['name']} ({brand}): ₹{old_price} → ₹{display_price} ({'+' if diff > 0 else ''}{diff}) via {source}")

    print(f"[OK] Checked {checked} phones. Updated {updated_count}. Matched {matched}. No URL: {skipped_no_url}. Scrape failed: {skipped_no_price}.")

TRACKED_BRANDS = FLIPKART_BRANDS + AMAZON_BRANDS + BOTH_BRANDS


def _source_for_brand(brand: str) -> str | None:
    if brand in FLIPKART_BRANDS:
        return "flipkart"
    if brand in AMAZON_BRANDS:
        return "amazon"
    return None


def check_launches(dry_run: bool = False):
    print(f"Checking for new launches...{' (DRY RUN)' if dry_run else ''}")
    existing = fetch_all_products()
    existing_names = [p.get("name", "") for p in existing]

    added = 0
    for brand in TRACKED_BRANDS:
        source = _source_for_brand(brand)
        if source is None:
            continue
        print(f"  Scanning {brand} on {source}...")
        try:
            listings = get_brand_listings(brand, source)
        except Exception as e:
            print(f"    ERROR fetching listings for {brand}: {e}")
            continue

        for name, url in listings:
            if any(is_match(name, ex) for ex in existing_names):
                continue

            details = (
                get_flipkart_details(url) if source == "flipkart"
                else get_amazon_details(url)
            )
            price = details.get("price")
            if price is not None and (price < 1000 or price > 250000):
                print(f"    SKIP {name}: implausible price ₹{price}")
                continue

            if dry_run:
                print(f"    [DRY RUN] would add: {name} ({brand}) {url}")
            else:
                res = create_full_product(name, brand, source, url, details)
                if res is None:
                    print(f"    SKIP {name}: could not create (brand missing?)")
                    continue
                print(f"    + added draft: {name} ({brand})")

            added += 1

    print(f"[OK] Found/added {added} new phone(s).")
    return added


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str, required=True, choices=["sync", "launch"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.mode == "sync":
        sync_prices()
    elif args.mode == "launch":
        check_launches(dry_run=args.dry_run)
