import os
import requests
from datetime import datetime

PROJECT_ID = os.getenv("SANITY_PROJECT_ID")
DATASET = os.getenv("SANITY_DATASET")
TOKEN = os.getenv("SANITY_TOKEN")

BASE_URL = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

# When the scraper only returns a single product-level price (no per-variant
# break-down), we still want variant prices to track the market. We scale the
# existing per-variant tiers proportionally so the CHEAPEST variant lands on the
# scraped price and the other tiers keep their relative spread. The band below
# blocks corrupting prices when a scrape returns an outlier / wrong config.
VARIANT_SCALE_MIN = 0.6
VARIANT_SCALE_MAX = 1.6


def fetch_all_products():
    # Include `brandSlug` and `enabled` so the price-sync orchestrator can
    # route by brand slug (case-insensitive) and skip draft (`enabled:false`)
    # products. Without this we routed by display name — that missed "POCO"
    # (listed as "Poco" in the constant) entirely.
    # Also fetch `variants` so the sync loop can match and update per-variant
    # prices alongside the root price.
    query = (
        '*[_type == "product"]{'
        '_id, name, slug, brand->{name, "slug": slug.current}, '
        'amazonUrl, flipkartUrl, price, amazonPrice, flipkartPrice, '
        'priceLocked, enabled, lastUpdated, variants'
        '}'
    )
    url = f"{BASE_URL}/data/query/{DATASET}?query={requests.utils.quote(query)}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        rows = res.json().get("result", [])
        # Normalize: presenter mostly needs `brand.name` and `brandSlug`.
        for r in rows:
            brand = r.get("brand") or {}
            r["brandSlug"] = brand.get("slug")
        return rows
    print("Error fetching products:", res.text)
    return []


def _query(query: str) -> list:
    url = f"{BASE_URL}/data/query/{DATASET}?query={requests.utils.quote(query)}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return res.json().get("result", []) or []
    return []


def fetch_brand_id(brand_name: str):
    safe = brand_name.replace('"', "")
    q = f'*[_type=="brand" && name=="{safe}"]{{_id}}'
    rows = _query(q)
    return rows[0]["_id"] if rows else None


def fetch_category_id(slug: str):
    for cand in dict.fromkeys([slug, "smartphone", "mobile"]):
        q = f'*[_type=="category" && slug.current=="{cand}"]{{_id}}'
        rows = _query(q)
        if rows:
            return rows[0]["_id"]
    return None


def fetch_existing_slugs() -> set:
    q = '*[_type=="product"]{slug}'
    rows = _query(q)
    return {r["slug"]["current"] for r in rows if r.get("slug")}


def unique_slug(name: str) -> str:
    from automation.utils import slugify

    base = slugify(name)
    existing = fetch_existing_slugs()
    if base not in existing:
        return base
    i = 2
    while f"{base}-{i}" in existing:
        i += 1
    return f"{base}-{i}"


def create(product_doc: dict) -> dict:
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {"mutations": [{"create": product_doc}]}
    res = requests.post(url, headers=HEADERS, json=mutations)
    print(f"Created draft product {product_doc.get('name')}: {res.status_code}")
    return res.json()


def create_full_product(name, brand_name, source, url, details):
    brand_id = fetch_brand_id(brand_name)
    if not brand_id:
        print(f"Skipping {name}: brand '{brand_name}' not found in Sanity")
        return None
    category_id = fetch_category_id("smartphone")
    slug = unique_slug(name)
    images = details.get("images") or []
    doc = {
        "_type": "product",
        "name": name,
        "slug": {"_type": "slug", "current": slug},
        "brand": {"_ref": brand_id, "_type": "reference"},
        "category": {"_ref": category_id, "_type": "reference"} if category_id else None,
        "enabled": True,
        "type": "smartphone",
        "stock": "in-stock",
        "description": details.get("description"),
        "price": details.get("price"),
        "images": images,
        "coverImage": images[0] if images else None,
        "colors": details.get("colors") or [],
        "variants": details.get("variants") or [],
        "specifications": details.get("specifications") or [],
        "amazonUrl": url if source == "amazon" else None,
        "flipkartUrl": url if source == "flipkart" else None,
        "lastUpdated": datetime.now().isoformat(),
    }
    return create(doc)


def create_product(product_data: dict) -> dict:
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {
        "mutations": [
            {
                "create": {
                    "_type": "product",
                    "name": product_data["title"],
                    "brand": {"_ref": product_data.get("brandRef", ""), "_type": "reference"},
                    "slug": {"_type": "slug", "current": product_data["slug"]},
                    "price": product_data.get("price"),
                    "amazonUrl": product_data.get("amazonUrl"),
                    "flipkartUrl": product_data.get("flipkartUrl"),
                    "amazonPrice": product_data.get("amazonPrice"),
                    "flipkartPrice": product_data.get("flipkartPrice"),
                    "description": product_data.get("description"),
                    "enabled": True,
                    "lastUpdated": datetime.now().isoformat(),
                }
            }
        ]
    }
    res = requests.post(url, headers=HEADERS, json=mutations)
    print(f"Created {product_data['title']}: {res.status_code}")
    return res.json()


def update_price(product_id: str, amazon_price, flipkart_price, display_price) -> dict:
    """Patch a product's prices in Sanity.

    Only fields that carry a new, valid value are included in the mutation.
    A single-source scrape (e.g. Flipkart only) must NOT send
    `amazonPrice: null` — that would wipe the Amazon price we already store.
    The unified `price` field is always set to the freshly scraped value.

    Raises RuntimeError on a non-2xx Sanity response so the orchestrator can
    count the failure and (in __main__) exit non-zero instead of reporting a
    false green.
    """
    set_fields = {
        "price": display_price,
        "lastUpdated": datetime.now().isoformat(),
    }
    if amazon_price is not None:
        set_fields["amazonPrice"] = amazon_price
    if flipkart_price is not None:
        set_fields["flipkartPrice"] = flipkart_price

    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {"mutations": [{"patch": {"id": product_id, "set": set_fields}}]}
    res = requests.post(url, headers=HEADERS, json=mutations)
    if res.status_code not in (200, 201):
        # Surface the failure loudly instead of swallowing it — the previous
        # code returned res.json() even on a 4xx, hiding the error from the
        # orchestrator's "matched/updated" counters.
        raise RuntimeError(
            f"Sanity price update failed for {product_id}: "
            f"HTTP {res.status_code} {res.text[:200]}"
        )
    body = res.json() if res.text else {}
    if not body.get("results"):
        print(f"  WARNING: Sanity returned no mutation results for {product_id}: {body}")
    return body


def update_price_and_variants(product_id: str, product_name: str,
                               amazon_price, flipkart_price, display_price,
                               scraped_variants: list,
                               existing_variants: list) -> dict:
    """Patch a product's prices AND per-variant prices in Sanity.

    Matches scraped variants to existing Sanity variants by RAM/Storage.
    If a scraped variant has a specific price, it's applied. An existing
    per-variant price is NEVER overwritten with the single product-level
    `display_price` — doing so would collapse every variant to one value and
    the storefront would show no price change when the user switches variants.
    The root `price` field (always set below) is what receives display_price.

    Only Amazon/Flipkart prices that carry a new, valid value are included,
    so a single-source scrape does NOT wipe the other marketplace price.
    """
    set_fields = {
        "price": display_price,
        "lastUpdated": datetime.now().isoformat(),
    }
    if amazon_price is not None:
        set_fields["amazonPrice"] = amazon_price
    if flipkart_price is not None:
        set_fields["flipkartPrice"] = flipkart_price

    # Update variants array with scraped prices (or fallback to display_price)
    updated_variants = []
    applied_scraped = False
    for v in existing_variants:
        ram = str(v.get("ram", "")).lower().strip()
        storage = str(v.get("storage", "")).lower().strip()

        # Try to find a matching scraped variant
        matched_scraped = None
        for sv in scraped_variants:
            sv_ram = str(sv.get("ram", "")).lower().strip()
            sv_storage = str(sv.get("storage", "")).lower().strip()
            if sv_ram == ram and sv_storage == storage:
                matched_scraped = sv
                break

        new_variant_price = v.get("price")
        if matched_scraped and matched_scraped.get("price") is not None:
            new_variant_price = matched_scraped["price"]
            applied_scraped = True
        elif new_variant_price is None and display_price is not None:
            # Only fill in a price for a variant that has NONE at all
            # (e.g. a freshly created launch). Never overwrite an existing
            # per-variant price with the single product-level price.
            new_variant_price = display_price

        new_v = dict(v)
        if new_variant_price is not None:
            new_v["price"] = new_variant_price
        updated_variants.append(new_v)

    # No real per-variant scrape available -> proportionally scale the existing
    # tiers so variant prices also track the live (single) scraped price. The
    # cheapest variant lands on display_price; other tiers keep their spread.
    if not applied_scraped and display_price is not None and updated_variants:
        priced = [v for v in updated_variants if isinstance(v.get("price"), (int, float))]
        if priced:
            base = min(v["price"] for v in priced)
            if base > 0:
                scale = display_price / base
                if VARIANT_SCALE_MIN <= scale <= VARIANT_SCALE_MAX:
                    for v in updated_variants:
                        if isinstance(v.get("price"), (int, float)):
                            v["price"] = round(v["price"] * scale)
                else:
                    print(
                        f"  WARNING: variant scale {scale:.2f} out of "
                        f"[{VARIANT_SCALE_MIN},{VARIANT_SCALE_MAX}] for "
                        f"{product_name}; keeping existing variant prices"
                    )

    if updated_variants:
        set_fields["variants"] = updated_variants

    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {"mutations": [{"patch": {"id": product_id, "set": set_fields}}]}
    res = requests.post(url, headers=HEADERS, json=mutations)
    if res.status_code not in (200, 201):
        raise RuntimeError(
            f"Sanity price+variants update failed for {product_id}: "
            f"HTTP {res.status_code} {res.text[:200]}"
        )
    body = res.json() if res.text else {}
    if not body.get("results"):
        print(f"  WARNING: Sanity returned no mutation results for {product_id}: {body}")
    return body


def update_url(product_id: str, url: str) -> dict:
    """Set a product's marketplace URL in Sanity.

    Routes the URL to the right field by host (flipkart.com -> flipkartUrl,
    amazon.in -> amazonUrl) and clears the other field so a stale URL for the
    wrong marketplace can't linger. Raises RuntimeError on a non-2xx response
    so callers can fail loudly instead of reporting green.
    """
    field = "flipkartUrl" if "flipkart.com" in url else "amazonUrl"
    other = "amazonUrl" if field == "flipkartUrl" else "flipkartUrl"
    set_fields = {field: url}
    unset_fields = [other]
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {
        "mutations": [
            {"patch": {"id": product_id, "set": set_fields, "unset": unset_fields}}
        ]
    }
    res = requests.post(url, headers=HEADERS, json=mutations)
    if res.status_code not in (200, 201):
        raise RuntimeError(
            f"Sanity url update failed for {product_id}: "
            f"HTTP {res.status_code} {res.text[:200]}"
        )
    return res.json() if res.text else {}
