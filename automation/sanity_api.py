import os
import time
import requests
from datetime import datetime


def _mutate(mutations: dict, *, retries: int = 3) -> dict:
    """POST a Sanity mutation with bounded retry for transient failures.

    Retries on network errors and on 429/5xx responses (rate limits, brief
    outages). Non-transient 4xx (e.g. 400/401/403) and 2xx are returned
    immediately so the caller's error logic stays authoritative. Raises
    RuntimeError on a final non-2xx response so the orchestrator can count
    the failure and exit non-zero instead of reporting a false green.
    """
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            res = requests.post(url, headers=HEADERS, json=mutations)
        except requests.RequestException as e:
            last_err = e
            print(f"  Sanity mutation network error (attempt {attempt}/{retries}): {e}")
            if attempt < retries:
                time.sleep(min(2 ** attempt, 8))
            continue
        if res.status_code in (200, 201):
            body = res.json() if res.text else {}
            if not body.get("results"):
                print(f"  WARNING: Sanity returned no mutation results: {body}")
            return body
        # Transient? Retry only on 429 / 5xx.
        if res.status_code in (429, 500, 502, 503, 504):
            last_err = f"HTTP {res.status_code}"
            print(f"  Sanity mutation {res.status_code} (attempt {attempt}/{retries}); retrying")
            if attempt < retries:
                time.sleep(min(2 ** attempt, 8))
            continue
        # Non-transient 4xx: surface immediately.
        raise RuntimeError(
            f"Sanity mutation failed: HTTP {res.status_code} {res.text[:200]}"
        )
    raise RuntimeError(f"Sanity mutation failed after {retries} attempts: {last_err}")


def _norm_variant_size(value) -> str:
    """Normalize a RAM/Storage token for matching.

    Collapses spacing/units so "8 GB" == "8GB" and "128 GB" == "128GB". An
    empty/absent value stays empty so missing storage still matches missing
    storage rather than collapsing to "0" or "gb".
    """
    if not value:
        return ""
    s = str(value).lower().strip()
    s = s.replace(" ", "").replace("gb", "").replace("ram", "").replace("rom", "")
    return s

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
# How strongly variant prices track the live single scraped price. 1.0 = snap
# exactly to the scraped price (full re-anchor); <1.0 = only NUDGE slightly so
# variant prices partially match Flipkart/Amazon rather than fully matching.
VARIANT_SCALE_BLEND = 0.35


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
    # _mutate retries transient 429/5xx and raises RuntimeError on a final
    # non-2xx response, so the orchestrator counts the failure and exits
    # non-zero rather than reporting a false green.
    return _mutate(mutations)


def _merge_variant_marketplace_prices(target: dict, scraped: dict | None,
                                  fallback_flipkart: float | None = None,
                                  fallback_amazon: float | None = None) -> None:
    """Carry a scraped variant's per-marketplace price onto a Sanity variant.

    The scraped variant (from Flipkart or Amazon) carries either a
    `flipkartPrice` or an `amazonPrice` key (plus the legacy `price`
    alias). We copy whichever marketplace key is present onto `target`
    *without* touching the other marketplace's key, so a single-source
    run never wipes a price previously written by the other source.

    When the scraped variant has no marketplace key of its own (e.g. the
    Rule-2 fallback-nudge path where no exact variant matched), we fall
    back to the product-level `flipkartPrice`/`amazonPrice` so every
    variant still gets a per-marketplace breakdown once the product has
    been synced. Only non-None, positive prices are written, and we never
    overwrite an existing marketplace price with a weaker fallback.
    """
    if not isinstance(scraped, dict):
        scraped = {}
    fallbacks = {"flipkartPrice": fallback_flipkart, "amazonPrice": fallback_amazon}
    for mk in ("flipkartPrice", "amazonPrice"):
        val = scraped.get(mk)
        if not (isinstance(val, (int, float)) and val > 0):
            val = fallbacks.get(mk)
        if isinstance(val, (int, float)) and val > 0 and target.get(mk) is None:
            target[mk] = int(val)


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

    When only a single product-level price is scraped (the normal case), the
    existing per-variant tiers are nudged by VARIANT_SCALE_BLEND so they
    *slightly* track the live Flipkart/Amazon price instead of snapping to it
    (full exact per-variant scraping isn't available — see experiment notes).
    The move is bounded by VARIANT_SCALE_MIN/MAX to reject outlier scrapes.

    Only Amazon/Flipkart prices that carry a new, valid value are included,
    so a single-source scrape does NOT wipe the other marketplace price.
    """
    set_fields = {
        "price": display_price,
        "lastUpdated": datetime.now().isoformat(),
        # Written ONLY on a successful price write, so the delta-sync gate
        # never treats a blocked/empty scrape as "fresh". Distinct from
        # lastScrapedAt (which is set even on blocks) — see record_freshness.
        "lastPriceUpdatedAt": datetime.now().isoformat(),
    }
    if amazon_price is not None:
        set_fields["amazonPrice"] = amazon_price
    if flipkart_price is not None:
        set_fields["flipkartPrice"] = flipkart_price

    # Update variants array with scraped prices (or fallback to display_price)
    updated_variants = []
    applied_scraped = False
    exact_matches = 0
    for v in existing_variants:
        ram = _norm_variant_size(v.get("ram"))
        storage = _norm_variant_size(v.get("storage"))

        # Try to find a matching scraped variant (exact RAM+storage first,
        # then a looser RAM-only fallback so a listing that omits storage
        # still anchors the right tier).
        matched_scraped = None
        for sv in scraped_variants:
            sv_ram = _norm_variant_size(sv.get("ram"))
            sv_storage = _norm_variant_size(sv.get("storage"))
            if sv_ram == ram and sv_storage == storage:
                matched_scraped = sv
                break
        if matched_scraped is None and ram:
            for sv in scraped_variants:
                if _norm_variant_size(sv.get("ram")) == ram and sv.get("price") is not None:
                    matched_scraped = sv
                    break

        new_variant_price = v.get("price")
        if matched_scraped and matched_scraped.get("price") is not None:
            # Rule 1 (Exact Match): apply the scraped price verbatim. The
            # per-variant plausibility guard (is_price_plausible) has already
            # run in the orchestrator against the display price, so a matched
            # variant that is wildly off would have been rejected upstream.
            new_variant_price = matched_scraped["price"]
            applied_scraped = True
            exact_matches += 1
            print(f"    EXACT MATCH APPLIED: {ram}/{storage} -> Rs{new_variant_price}")
        elif new_variant_price is None and display_price is not None:
            # Only fill in a price for a variant that has NONE at all
            # (e.g. a freshly created launch). Never overwrite an existing
            # per-variant price with the single product-level price.
            new_variant_price = display_price

        new_v = dict(v)
        # Guard (regression fix): never let a sync write a variant that drops
        # the existing ram/storage/colors, even if the scraped data lacked
        # them. A variant without ram/storage makes the PDP selector render no
        # buttons and the price never change on click. Carry forward the
        # existing values when the merged variant is missing them.
        for _field in ("ram", "storage", "colors"):
            if not new_v.get(_field) and v.get(_field):
                new_v[_field] = v[_field]
        if new_variant_price is not None:
            new_v["price"] = new_variant_price
        # Per-variant marketplace prices: carry the scraped Flipkart/Amazon
        # price onto the matching variant WITHOUT wiping the other source. A
        # single-source scrape only ever sets that one marketplace's key, so a
        # Flipkart-only run leaves any existing amazonPrice intact and vice
        # versa. When both sources are scraped (source == "both"), both keys
        # end up populated on the same variant object.
        _merge_variant_marketplace_prices(
            new_v, matched_scraped,
            fallback_flipkart=flipkart_price,
            fallback_amazon=amazon_price,
        )
        updated_variants.append(new_v)

    # No real per-variant scrape available -> nudge the existing tiers so
    # variant prices *slightly* track the live (single) scraped price. The
    # cheapest variant is the reference; other tiers keep their relative spread.
    # VARIANT_SCALE_BLEND damps the move so prices partially match Flipkart/
    # Amazon rather than snapping exactly to them.
    nudged = False
    if not applied_scraped and display_price is not None and updated_variants:
        priced = [v for v in updated_variants if isinstance(v.get("price"), (int, float))]
        if priced:
            base = min(v["price"] for v in priced)
            if base > 0:
                scale = display_price / base
                if VARIANT_SCALE_MIN <= scale <= VARIANT_SCALE_MAX:
                    # Rule 2 (Fallback Nudge): no exact scraped variant matched,
                    # so nudge the existing tiers slightly toward the live price.
                    blend = 1.0 + VARIANT_SCALE_BLEND * (scale - 1.0)
                    for v in updated_variants:
                        if isinstance(v.get("price"), (int, float)):
                            v["price"] = round(v["price"] * blend)
                    nudged = True
                    print(
                        f"    FALLBACK NUDGE APPLIED: {product_name} "
                        f"(scale {scale:.2f}, blend {blend:.3f})"
                    )
                else:
                    print(
                        f"  WARNING: variant scale {scale:.2f} out of "
                        f"[{VARIANT_SCALE_MIN},{VARIANT_SCALE_MAX}] for "
                        f"{product_name}; keeping existing variant prices"
                    )

    if updated_variants:
        set_fields["variants"] = updated_variants

    mutations = {"mutations": [{"patch": {"id": product_id, "set": set_fields}}]}
    result = _mutate(mutations)
    # Surface per-variant sync accounting so the orchestrator can report it
    # (Rule 1 exact matches vs Rule 2 fallback nudges).
    if isinstance(result, dict):
        result["exact_matches"] = exact_matches
        result["nudged"] = nudged
    return result


def flag_manual_review(product_id: str, failed: bool, threshold: int = 3) -> None:
    """Track consecutive sync failures and flag products that need a human.

    Called by the orchestrator on every scrape outcome for a product:
      * failed=True  — the product was skipped (bot-block / implausible /
        URL mismatch), so its `syncFailCount` is incremented.
      * failed=False — a real price was written, so the counter resets to 0
        and any prior `needsManualReview` flag is cleared.

    Once `syncFailCount` reaches `threshold` (default 3 consecutive cycles),
    `needsManualReview` is set so an operator can fix the URL or scraper.
    Raises RuntimeError on a non-2xx response (counted as a hard failure by
    the orchestrator, same as the price mutations).
    """
    # Read the current counter so we can increment atomically-ish (the 6h cron
    # never overlaps, so a single read-modify-write is safe). `_query` returns
    # either a list (GROQ array) or — for a `[0]` single-object query — the
    # object directly, so normalise both shapes.
    raw = _query(
        f'*[_id=="{product_id}"][0]{{syncFailCount, needsManualReview}}'
    )
    current = raw[0] if isinstance(raw, list) and raw else (raw if isinstance(raw, dict) else None)
    prev_raw = current.get("syncFailCount", 0) if current else 0
    prev = prev_raw if isinstance(prev_raw, (int, float)) else 0
    count = (prev + 1) if failed else 0
    needs = count >= threshold
    set_fields = {
        "syncFailCount": count,
        "needsManualReview": needs,
    }
    mutations = {"mutations": [{"patch": {"id": product_id, "set": set_fields}}]}
    _mutate(mutations)


def record_freshness(product_id: str, status: str) -> None:
    """Write scrape freshness telemetry for a product.

    `status` is "ok" when a live price was successfully obtained, or "blocked"
    when every source returned no usable data (bot-wall / CAPTCHA). This lets
    operators see, at a glance, which products the automated sync is actively
    keeping current versus which are stale because the marketplace blocked the
    scraper. It never overwrites price/variant data — purely an audit field.
    Raises RuntimeError on a non-2xx response so the orchestrator can count it
    as a hard failure alongside the price mutations.
    """
    set_fields = {
        "lastScrapedAt": datetime.now().isoformat(),
        "scrapeStatus": status,
    }
    mutations = {"mutations": [{"patch": {"id": product_id, "set": set_fields}}]}
    _mutate(mutations)


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
    mutations = {
        "mutations": [
            {"patch": {"id": product_id, "set": set_fields, "unset": unset_fields}}
        ]
    }
    return _mutate(mutations)
