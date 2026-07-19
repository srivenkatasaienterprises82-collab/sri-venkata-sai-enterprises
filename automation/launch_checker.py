"""Price sync & new-launch orchestrator for the SVS Enterprises storefront.

Runs as a GitHub Actions cron (`price-sync.yml` every 6h, `launch-check.yml`
daily at 03:00 UTC). Both modes use the same Sanity API client and the
per-source scrapers in `amazon.py` / `flipkart.py`.

Key design notes:

* **Brand routing uses brand _slug_, not display name.** The live Sanity
  dataset stores the brand as "POCO" (uppercase) while an earlier version of
  this file looked for "Poco". That name mismatch silently skipped every
  POCO product for weeks. Routing on the lowercase slug (`poco`) makes the
  map immune to display-name capitalization in the Studio.

* **No silent skips.** Every product that doesn't update emits a structured
  line with a `STATUS` and a `REASON` so the GitHub Actions log calls out
  the cause. This is the contract anyone triaging a run should rely on.

* **Price-change guards.** A relative-delta guard rejects jumps that exceed
  4x or drops below 50% of the previous price — those are almost certainly
  scraper/CAPTCHA artefacts (we already saw ₹173 saved for a Realme phone
  whose stored URL pointed at a tempered-glass listing). The hard band
  <1000/>250000 is kept as an absolute sanity floor/ceiling.

* **URL↔name sanity check.** Before scraping, we extract the product-slug
  tail of the stored Flipkart/Amazon URL and token-check it against the
  Sanity product name. If the URL looks like it's for a different product,
  we skip with a `url_name_mismatch` reason rather than overwriting the
  price with a value for the wrong phone (which is what previously happened
  for Redmi A4 → Redmi A7, Realme C83 → tempered glass, etc.).
"""
import argparse
import os
import re
import sys
import time
from datetime import datetime, timezone

from sanity_api import fetch_all_products, update_price, update_price_and_variants, create_full_product, record_freshness, flag_manual_review


def _review(product_id: str, failed: bool) -> None:
    """Record a sync outcome for the manual-review failure counter (PHASE 6).

    failed=True increments syncFailCount (bot-block / implausible / mismatch);
    failed=False resets it and clears needsManualReview. Failures here are
    non-fatal — they never abort the run, just telemetry. No-op when no
    SANITY_TOKEN is configured (local test runs) or during a --dry-run, so we
    never mutate Sanity while only validating.
    """
    if DRY_RUN or not os.getenv("SANITY_TOKEN"):
        return
    try:
        flag_manual_review(product_id, failed)
    except Exception as e:
        print(f"    review-flag write failed: {e}")
from amazon import get_amazon_price, get_amazon_details
from flipkart import get_flipkart_price, get_flipkart_details
from listing import get_brand_listings
from utils import (
    is_match,
    price_in_bounds,
    price_change_is_plausible,
    url_name_matches,
    url_color_matches,
)


def _norm_variant_key(ram: str | None, storage: str | None) -> tuple:
    """Normalise a (ram, storage) pair to a comparable key."""
    def _norm(v: str | None) -> str:
        if not v:
            return ""
        return re.sub(r"[\s_]", "", str(v)).lower()
    return (_norm(ram), _norm(storage))


def _merge_marketplace_variants(flipkart_variants: list, amazon_variants: list) -> list:
    """Merge Flipkart + Amazon per-variant prices into one list.

    Keyed by normalised (ram, storage). Each output variant carries:
      - `price`      : legacy alias = the Flipkart price when present,
                      else the Amazon price (used by the cheapest-variant
                      display_price logic downstream).
      - `flipkartPrice`: from the Flipkart variant (if any)
      - `amazonPrice`  : from the Amazon variant (if any)

    So a single Sanity variant can end up with BOTH marketplace prices,
    which is what lets the storefront show the Flipkart vs Amazon price
    per RAM/Storage combo and open the correct buy link. Variants found
    on only one marketplace simply keep that one price.
    """
    merged: dict[tuple, dict] = {}

    def _upsert(v: dict, mk: str) -> None:
        key = _norm_variant_key(v.get("ram"), v.get("storage"))
        if key not in merged:
            merged[key] = {
                "ram": v.get("ram"),
                "storage": v.get("storage"),
                "price": None,
                "flipkartPrice": None,
                "amazonPrice": None,
            }
        node = merged[key]
        mp = v.get(mk)
        if isinstance(mp, (int, float)) and mp > 0:
            node[mk] = int(mp)
            # Legacy `price` alias: prefer the first marketplace that has one.
            if node["price"] is None:
                node["price"] = int(mp)

    for v in flipkart_variants or []:
        _upsert(v, "flipkartPrice")
    for v in amazon_variants or []:
        _upsert(v, "amazonPrice")
    return list(merged.values())


def _variant_missing_marketplace(variants: list) -> bool:
    """True if any Sanity variant lacks a per-marketplace price key."""
    for v in variants or []:
        if v.get("flipkartPrice") is None and v.get("amazonPrice") is None:
            return True
    return False


def _maybe_backfill_variant_marketplace(product, amz_price, flip_price,
                                        scraped_variants, existing_variants) -> None:
    """On a MATCH (headline price unchanged) still write the per-variant
    Flipkart/Amazon breakdown if any variant is missing it.

    The marketplace keys are only populated on a real UPDATE, so products
    whose price already matched the seed would otherwise never show the
    FK/AZ split on the PDP. This backfill is a no-op when every variant
    already carries at least one marketplace price, so it's cheap.
    """
    if DRY_RUN:
        return
    if not _variant_missing_marketplace(existing_variants):
        return
    if not (isinstance(flip_price, (int, float)) or
            isinstance(amz_price, (int, float))):
        return
    try:
        update_price_and_variants(
            product["_id"],
            product.get("name", ""),
            amz_price, flip_price, product.get("price"),
            scraped_variants, existing_variants,
        )
        print("    BACKFILL: wrote per-variant marketplace prices")
    except Exception as e:
        print(f"    backfill failed: {e}")


LOG_FILE = "price-changes.csv"
INVALID_LOG_FILE = "invalid_products.csv"

# Brand slug → source. Slug-based so capitalization in the Studio doesn't
# silently drop a brand from sync (this was the "POCO" bug).
FLIPKART_BRAND_SLUGS = [
    "motorola", "oppo", "vivo", "realme", "poco", "nothing",
    # Narzo is a Realme sub-brand carried as its own brand in Sanity.
    "narzo",
    # Apple/Samsung are routed to Flipkart-only to avoid cross-platform
    # conflicts and bot-check issues on Amazon.
    "apple", "samsung",
]
# Amazon aggressively serves bot-check / price-less pages to automated browsers
# (CI datacenter IPs), so an Amazon-only route almost never yields a price.
# iQOO/Redmi DO have Flipkart listings, so they're routed to "both" — Flipkart
# supplies the price when Amazon is blocked, and the lower of the two is used
# when both succeed.
AMAZON_BRAND_SLUGS = []
# OnePlus/Pixel/iQOO/Redmi are sold on both platforms — scrape both and take
# the lower price so the storefront always shows the best deal.
BOTH_BRAND_SLUGS = [
    "oneplus", "pixel", "google", "iqoo", "redmi", "hmd", "infinix",
]

# ── Public surface ──────────────────────────────────────────────────────────
# `launch_checker.py` is also imported by `tests/test_launch_checker.py`. The
# tests monkeypatch the constants below, so they need to exist at module
# scope. To keep historical tests (`test_sync_skips_locked_product`) working
# we keep the old NAME-based constants too, but the routing logic now uses
# the slug maps. The NAME constants stay for backward compatibility only.
FLIPKART_BRANDS = [
    "Motorola", "Oppo", "Vivo", "Realme", "Poco", "Nothing",
    "Apple", "Samsung",
]
AMAZON_BRANDS = []
BOTH_BRANDS = ["OnePlus", "Google", "iQOO", "Redmi"]

# All supported brand slugs (used by the launch scanner to walk per-brand
# listings).
TRACKED_BRAND_SLUGS = FLIPKART_BRAND_SLUGS + AMAZON_BRAND_SLUGS + BOTH_BRAND_SLUGS
TRACKED_BRANDS = TRACKED_BRAND_SLUGS  # backwards-compat alias


def _slug_source_map():
    """Build a slug → source map from the active constants."""
    mapping = {}
    for s in FLIPKART_BRAND_SLUGS:
        mapping[s] = "flipkart"
    for s in AMAZON_BRAND_SLUGS:
        mapping[s] = "amazon"
    for s in BOTH_BRAND_SLUGS:
        mapping[s] = "both"
    return mapping


_SLUG_TO_SOURCE = _slug_source_map()


# ─── Logging ────────────────────────────────────────────────────────────────

def log_change(product_name, brand, old_price, new_price, source):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diff = new_price - (old_price or 0)
    arrow = "UP" if diff > 0 else "DOWN"
    line = f"{now},{product_name},{brand},{old_price},{new_price},{diff},{arrow},{source}"
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def _emit_row(product, status, *, source=None, old_price=None, new_price=None,
              reason="", scrape_ms=None, retries=0):
    """Print one structured row per product. Format is parse-able:

        STATUS | brand | product | source | old | new | ... | reason
    """
    brand = (product.get("brand") or {}).get("name", "")
    parts = [
        f"STATUS={status}",
        f"brand={brand}",
        f"product={product.get('name', '')}",
        f"source={source or ''}",
        f"old_price={old_price if old_price is not None else ''}",
        f"new_price={new_price if new_price is not None else ''}",
        f"retries={retries}",
        f"scrape_ms={int(scrape_ms)}" if scrape_ms is not None else "scrape_ms=",
        f"reason={reason}",
    ]
    print("  " + " | ".join(parts))


def _log_invalid(product, reason, url):
    """Append a row to `invalid_products.csv` for later operator triage.

    Covers missing URLs and URL↔name mismatches — the cases where we refuse
    to write a price because the stored URL can't be trusted to point at the
    right product.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    brand = (product.get("brand") or {}).get("name", "")
    with open(INVALID_LOG_FILE, "a") as f:
        f.write(f"{now},{product.get('name', '')},{brand},{reason},{url}\n")


# ─── Source routing ─────────────────────────────────────────────────────────

def get_assigned_source(product: dict) -> str | None:
    """Return 'flipkart' | 'amazon' | 'both' | None for a Sanity product.

    Routing is on the brand _slug_ — robust to capitalization in the Studio.
    As a fallback for legacy products without a brand slug we fall back to
    a case-insensitive display-name lookup against the historical NAME list.
    """
    brand_slug = (product.get("brandSlug") or "").lower()
    if brand_slug and brand_slug in _SLUG_TO_SOURCE:
        return _SLUG_TO_SOURCE[brand_slug]

    # Legacy fallback (case-insensitive). Keeps backward compatibility with
    # any pre-migration products that lack a brand->slug reference.
    name = (product.get("brand") or {}).get("name", "").lower()
    name_map = {
        **{b.lower(): "flipkart" for b in FLIPKART_BRANDS},
        **{b.lower(): "amazon" for b in AMAZON_BRANDS},
        **{b.lower(): "both" for b in BOTH_BRANDS},
        "poco": "flipkart",  # but slug already covers this; defensive only
        "narzo": "flipkart",
    }
    return name_map.get(name)


# ─── Price sync ─────────────────────────────────────────────────────────────

# Module-level flag so helper telemetry writers (_review, record_freshness)
# can skip Sanity mutations during a --dry-run validation pass.
DRY_RUN = False

# Delta-sync window: a product whose last *successful* price write is newer than
# this many hours is skipped to cut request volume (and stay under Flipkart/
# Amazon rate limits on GitHub's shared IP). With a 6h cron, this naturally
# spreads the catalog across cycles while guaranteeing every product refreshes
# at least once per window.
FRESH_WINDOW_HOURS = 24


def _is_fresh(product: dict) -> bool:
    """True if the product's last successful price write is within the window.

    Uses lastPriceUpdatedAt (set only on a real, successful write) so a product
    that was bot-walled on the last run is NOT considered fresh and will be
    scraped again. Products never updated (no timestamp) are never fresh.
    """
    ts = product.get("lastPriceUpdatedAt")
    if not ts:
        return False
    try:
        last = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return False
    age_hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600.0
    return age_hours < FRESH_WINDOW_HOURS


def sync_prices(dry_run: bool = False, brands: list[str] | None = None):
    global DRY_RUN
    DRY_RUN = dry_run
    print("Starting Price Sync..." + (" (DRY RUN — no Sanity writes)" if dry_run else ""))
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w") as f:
            f.write("timestamp,product,brand,old_price,new_price,diff,direction,source\n")
    if not os.path.exists(INVALID_LOG_FILE):
        with open(INVALID_LOG_FILE, "w") as f:
            f.write("timestamp,product,brand,reason,url\n")

    products = fetch_all_products()
    if brands:
        wanted = {b.lower().strip() for b in brands}
        products = [
            p for p in products
            if (p.get("brandSlug") or (p.get("brand") or {}).get("slug") or "").lower() in wanted
        ]
        print(f"Filtered to brands {sorted(wanted)} -> {len(products)} products")
    print(f"Found {len(products)} products in Sanity")

    updated_count = 0
    checked = 0
    matched = 0
    skipped_no_url = 0
    skipped_no_price = 0
    skipped_locked = 0
    skipped_disabled = 0
    skipped_url_mismatch = 0
    skipped_color_mismatch = 0
    skipped_implausible = 0
    skipped_dry = 0  # implausible-difference vs old price (≤ cap)
    skipped_fresh = 0  # delta-sync: last successful update still within window
    failed_mutations = 0
    invalid_urls = 0
    recovered = 0
    scrape_blocked = 0  # primary (and fallback) source(s) served bot-walls
    exact_updates = 0   # Rule 1: per-variant exact matches applied
    nudge_updates = 0   # Rule 2: per-variant fallback nudges applied

    for product in products:
        try:
            # Draft products (enabled:false) – created by the launch-checker. They
            # aren't visible on the storefront yet, so we don't price-sync them.
            # No silent skip: emit a row.
            if product.get("enabled") is False:
                skipped_disabled += 1
                _emit_row(product, "SKIP", reason="draft_disabled")
                continue

            if product.get("priceLocked"):
                skipped_locked += 1
                _emit_row(product, "SKIP", reason="price_locked")
                continue

            # ── Delta sync gate ──────────────────────────────────────────────────
            # Only scrape products whose last *successful* price update is older than
            # FRESH_WINDOW_HOURS. This keeps daily request volume ~1/4 of a full
            # scrape (Flipkart/Amazon rate-limit GitHub's shared IPs), while every
            # product is refreshed at least once per window. Gated on
            # lastPriceUpdatedAt (written only on a real write), NOT lastScrapedAt
            # (set even on blocks) — otherwise a product that got bot-walled would
            # be marked "fresh" and never retried.
            if _is_fresh(product):
                skipped_fresh += 1
                _emit_row(product, "SKIP", reason="fresh_data")
                continue

            source = get_assigned_source(product)
            brand = (product.get("brand") or {}).get("name", "")
            if source is None:
                # Unsupported brand. Not a "skip" — emit a NO_MAPPING row so the
                # operator can see unsupported brands and decide whether to add
                # them.
                _emit_row(product, "NO_MAPPING", reason=f"brand_unsupported:{brand}")
                continue

            flipkart_url = product.get("flipkartUrl")
            amazon_url = product.get("amazonUrl")
            old_price = product.get("price")
            existing_variants = product.get("variants") or []
            checked += 1

            # ── URL Resolution with Auto-Search ────────────────────────────────
            # Determine the primary URL for this source, auto-searching if missing.
            url_for_check = flipkart_url if source != "amazon" else amazon_url
            if source == "both":
                url_for_check = flipkart_url or amazon_url

            if not url_for_check:
                # Auto-search: try to find the URL dynamically from brand listings
                brand_slug = (product.get("brandSlug") or brand).lower()
                search_source = source if source != "both" else "flipkart"
                try:
                    listings = get_brand_listings(brand_slug, search_source)
                    for name, url in listings:
                        if is_match(product.get("name", ""), name):
                            url_for_check = url
                            # Patch the found URL into Sanity so we don't search
                            # again on the next run — but ONLY if it actually names
                            # the right product. Persisting a URL that fails the
                            # name check would poison Sanity with a wrong listing
                            # (the C83 → tempered-glass case) and make every
                            # subsequent run red.
                            if url_name_matches(product.get("name", ""), url):
                                try:
                                    from sanity_api import update_url as _patch_url
                                    _patch_url(product["_id"], url_for_check)
                                except Exception:
                                    pass  # Non-critical; log and continue
                            if search_source == "flipkart":
                                flipkart_url = url_for_check
                            else:
                                amazon_url = url_for_check
                            print(f"  -> Auto-found URL: {url_for_check}")
                            break
                except Exception as e:
                    print(f"  Auto-search failed for {product.get('name')}: {e}")

            if not url_for_check:
                skipped_no_url += 1
                # Missing a marketplace URL is expected for most products (only a
                # subset is tracked) — it is NOT a failure that should turn the run
                # red. Log it for triage but don't count it as an invalid URL.
                _log_invalid(product, "no_url", url_for_check or "")
                _emit_row(product, "SKIP", source=source, old_price=old_price,
                          reason="no_url")
                continue

            # Enforce URL↔name sanity before scraping. A bad URL silently returns
            # the price of a *different* product. The C83 screen-protector case
            # is what motivated this guard.
            #
            # A product whose URL fails this check is SKIPPED (no wrong price is
            # ever written), so it is *not* a broken run — we log it to the
            # invalid_products.csv artifact for triage but do NOT fail the
            # workflow. Failing the whole run here only produces a perpetually-red
            # sync for stale data and blocks every other product's update.
            if not url_name_matches(product.get("name", ""), url_for_check):
                skipped_url_mismatch += 1
                _log_invalid(product, "url_name_mismatch", url_for_check)
                _emit_row(product, "SKIP", source=source, old_price=old_price,
                          reason="url_name_mismatch")
                continue

            # Colour-way guard: reject URLs whose slug names a colour the product
            # doesn't come in (e.g. a "passion-red" URL for a product listed only
            # in Black/Blue). Colourways carry different prices/stock, so a match
            # on the wrong colourway would write the wrong price. Logged to
            # invalid_products.csv for triage.
            if not url_color_matches(product.get("name", ""), url_for_check,
                                      product.get("colors") or []):
                skipped_color_mismatch += 1
                _log_invalid(product, "url_color_mismatch", url_for_check)
                _emit_row(product, "SKIP", source=source, old_price=old_price,
                          reason="url_color_mismatch")
                continue

            amz_price = None
            flip_price = None
            display_price = None
            scraped_variants = []

            scrape_start = time.time()
            retries_used = 0
            blocked = False  # True when the primary source returned no data (bot-wall)

            if source == "flipkart":
                if not flipkart_url and not url_for_check:
                    skipped_no_url += 1
                    _emit_row(product, "SKIP", source=source, old_price=old_price,
                              reason="no_flipkartUrl")
                    continue
                flip_url = flipkart_url or url_for_check
                details = get_flipkart_details(flip_url)
                flip_price = details.get("price")
                scraped_variants = details.get("variants", [])
                if flip_price is None:
                    blocked = True
            elif source == "amazon":
                if not amazon_url and not url_for_check:
                    skipped_no_url += 1
                    _emit_row(product, "SKIP", source=source, old_price=old_price,
                              reason="no_amazonUrl")
                    continue
                amz_url = amazon_url or url_for_check
                details = get_amazon_details(amz_url)
                amz_price = details.get("price")
                scraped_variants = details.get("variants", [])
                if amz_price is None:
                    blocked = True
            elif source == "both":
                flip_details = get_flipkart_details(flipkart_url) if flipkart_url else {}
                amz_details = get_amazon_details(amazon_url) if amazon_url else {}
                flip_price = flip_details.get("price")
                amz_price = amz_details.get("price")
                # Merge BOTH marketplaces' per-variant prices into a single
                # variant list, keyed by (ram, storage). A variant from Flipkart
                # carries flipkartPrice; one from Amazon carries amazonPrice; the
                # merge co-locates them so a single Sanity variant ends up with
                # BOTH marketplace prices (the user's "lowest / buy-now opens
                # correct config" requirement). Variants found on only one
                # marketplace simply keep that one marketplace's price.
                scraped_variants = _merge_marketplace_variants(
                    flip_details.get("variants", []),
                    amz_details.get("variants", []),
                )
                # BOTH-source product but no amazonUrl stored: Flipkart gave us a
                # price, but we still want the Amazon price (and per-variant AZ
                # breakdown). Re-resolve the Amazon listing ONCE so these products
                # aren't stuck with only a Flipkart price.
                if amz_price is None and flip_price is not None:
                    brand_slug = (product.get("brandSlug") or brand).lower()
                    try:
                        listings = get_brand_listings(brand_slug, "amazon")
                        for name, url in listings:
                            if not is_match(product.get("name", ""), name):
                                continue
                            if not url_name_matches(product.get("name", ""), url):
                                continue
                            amz_details = get_amazon_details(url)
                            amz_price = amz_details.get("price")
                            if amz_details.get("variants"):
                                scraped_variants = _merge_marketplace_variants(
                                    scraped_variants, amz_details["variants"])
                            print(f"  -> Amazon price recovered via re-search: {amz_price}")
                            break
                    except Exception as e:
                        print(f"    Amazon re-search skipped for {product.get('name')}: {e}")

            # Cross-source fallback (bot-block resilience). A single-source brand
            # (Flipkart-only / Amazon-only) whose primary marketplace served a
            # bot-check interstitial would otherwise stay stale FOREVER. If the
            # product has a URL on the *other* marketplace, try it once — but only
            # write the price if it survives the existing name/colour/plausibility
            # guards downstream. This is what keeps the storefront fresh when
            # Flipkart (the primary source for most brands here) blocks the CI IP.
            if blocked:
                alt_source, alt_url = None, None
                if source == "flipkart" and amazon_url:
                    alt_source, alt_url = "amazon", amazon_url
                elif source == "amazon" and flipkart_url:
                    alt_source, alt_url = "flipkart", flipkart_url
                if alt_source and alt_url and url_name_matches(product.get("name", ""), alt_url):
                    print(f"  -> Primary source blocked; trying {alt_source} fallback")
                    alt_details = (
                        get_amazon_details(alt_url) if alt_source == "amazon"
                        else get_flipkart_details(alt_url)
                    )
                    if alt_source == "amazon":
                        amz_price = alt_details.get("price")
                        if alt_details.get("variants"):
                            # Merge the recovered Amazon variants into whatever
                            # the primary (blocked) source already collected.
                            scraped_variants = _merge_marketplace_variants(
                                scraped_variants, alt_details["variants"])
                    else:
                        flip_price = alt_details.get("price")
                        if alt_details.get("variants"):
                            scraped_variants = _merge_marketplace_variants(
                                scraped_variants, alt_details["variants"])
                    if (amz_price if alt_source == "amazon" else flip_price) is not None:
                        retries_used = 1
                        print(f"  -> Recovered price via {alt_source} fallback")

            # Single recovery attempt: if both scrapers came back empty we may have
            # hit a transient bot-check / CAPTCHA interstitial (common for CI IPs)
            # on a URL that's actually valid. Re-resolve the product URL from the
            # brand's live listings and re-scrape ONCE before giving up — but only
            # if the freshly found URL also passes the name guard, so we never
            # write a price for the wrong product.
            recovered = False
            if flip_price is None and amz_price is None:
                brand_slug = (product.get("brandSlug") or brand).lower()
                search_source = source if source != "both" else "flipkart"
                try:
                    listings = get_brand_listings(brand_slug, search_source)
                    for name, url in listings:
                        if not is_match(product.get("name", ""), name):
                            continue
                        if not url_name_matches(product.get("name", ""), url):
                            continue
                        if search_source == "flipkart":
                            details = get_flipkart_details(url)
                            flip_price = details.get("price")
                            if details.get("variants"):
                                scraped_variants = details["variants"]
                            flipkart_url = url
                        else:
                            details = get_amazon_details(url)
                            amz_price = details.get("price")
                            if details.get("variants"):
                                scraped_variants = details["variants"]
                            amazon_url = url
                        print(f"  -> Recovered URL via re-search: {url}")
                        retries_used = 1
                        recovered += 1
                        break
                except Exception as e:
                    print(f"  Auto re-search failed for {product.get('name')}: {e}")

            if source == "both":
                prices = [p for p in [amz_price, flip_price] if p is not None]
                if not prices:
                    _emit_row(product, "SKIP", source=source, old_price=old_price,
                              reason="both_scrapers_returned_none",
                              retries=retries_used)
                    skipped_no_price += 1
                    scrape_blocked += 1
                    # Telemetry: record that we tried and were blocked, so the
                    # freshness report shows this product isn't being kept current.
                    try:
                        if not DRY_RUN:
                            record_freshness(product["_id"], "blocked")
                    except Exception as e:
                        print(f"    freshness write failed: {e}")
                    _review(product["_id"], True)
                    continue
                display_price = min(prices)
            else:
                # Single-source brand. `blocked` means the primary returned nothing;
                # the cross-source fallback above may have recovered a price from the
                # *other* marketplace — prefer that over the (None) primary so the
                # product stays fresh instead of going stale forever.
                if source == "flipkart":
                    display_price = flip_price if flip_price is not None else amz_price
                else:
                    display_price = amz_price if amz_price is not None else flip_price

            # When the scraper returned real per-variant prices, the product's
            # top-level `price` should reflect the cheapest variant (so the
            # storefront default shows the entry-level price) and the per-variant
            # prices flow through update_price_and_variants verbatim (Rule 1).
            priced_variants = [v["price"] for v in scraped_variants
                               if isinstance(v.get("price"), (int, float))]
            if priced_variants:
                display_price = min(priced_variants)

            scrape_ms = (time.time() - scrape_start) * 1000

            if display_price is None:
                skipped_no_price += 1
                _emit_row(product, "SKIP", source=source, old_price=old_price,
                          reason="scraper_returned_none", scrape_ms=scrape_ms,
                          retries=retries_used)
                scrape_blocked += 1
                try:
                    if not DRY_RUN:
                        record_freshness(product["_id"], "blocked")
                except Exception as e:
                    print(f"    freshness write failed: {e}")
                _review(product["_id"], True)
                continue

            # Hard band guard.
            if not price_in_bounds(display_price):
                skipped_implausible += 1
                _emit_row(product, "SKIP", source=source, old_price=old_price,
                          new_price=display_price, reason="price_out_of_band",
                          scrape_ms=scrape_ms)
                _review(product["_id"], True)
                continue

            # Relative-delta guard. Reject suspicious_price_change vs the old
            # Sanity price — only if we had one. This is the guard that would
            # have caught the C83 → ₹173 accessory swap.
            ok, why = price_change_is_plausible(old_price, display_price)
            if not ok:
                skipped_dry += 1
                _emit_row(product, "SKIP", source=source, old_price=old_price,
                          new_price=display_price, reason=f"implausible_delta:{why}",
                          scrape_ms=scrape_ms)
                _review(product["_id"], True)
                continue

            if old_price == display_price:
                matched += 1
                _emit_row(product, "MATCH", source=source, old_price=old_price,
                          new_price=display_price, scrape_ms=scrape_ms,
                          retries=retries_used)
                _review(product["_id"], False)
                # Even when the headline price is unchanged, a product may
                # still be missing its per-variant Flipkart/Amazon breakdown
                # (the marketplace keys are only written on a real UPDATE).
                # Backfill them now so every PDP shows the FK/AZ split.
                _maybe_backfill_variant_marketplace(
                    product, amz_price, flip_price, scraped_variants,
                    existing_variants)
                continue

            # Update Sanity (including per-variant prices). A non-2xx response
            # raises RuntimeError, which we count as a hard failure. Under a dry
            # run we skip the write entirely and just log what *would* change.
            if DRY_RUN:
                print(f"    >> DRY-RUN would update Rs{old_price} -> Rs{display_price} via {source}")
                updated_count += 1
                _emit_row(product, "UPDATE", source=source, old_price=old_price,
                          new_price=display_price, scrape_ms=scrape_ms,
                          retries=retries_used)
                continue

            try:
                mut = update_price_and_variants(
                    product["_id"],
                    product.get("name", ""),
                    amz_price, flip_price, display_price,
                    scraped_variants,
                    existing_variants,
                )
            except Exception as e:
                failed_mutations += 1
                _emit_row(product, "ERROR", source=source, old_price=old_price,
                          new_price=display_price, reason=f"sanity_mutation_failed:{e}",
                          scrape_ms=scrape_ms)
                _review(product["_id"], True)
                continue
            if not mut or not mut.get("results"):
                failed_mutations += 1
                _emit_row(product, "ERROR", source=source, old_price=old_price,
                          new_price=display_price, reason="sanity_mutation_failed",
                          scrape_ms=scrape_ms)
                _review(product["_id"], True)
                continue

            updated_count += 1
            diff = display_price - (old_price or 0)
            arrow = "^" if diff > 0 else "v"
            log_change(product["name"], brand, old_price, display_price, source)
            _emit_row(product, "UPDATE", source=source, old_price=old_price,
                      new_price=display_price, scrape_ms=scrape_ms,
                      retries=retries_used)
            print(f"    {arrow} Rs{old_price} -> Rs{display_price} ({'+' if diff > 0 else ''}{diff}) via {source}")
            # Per-variant accounting from the mutation result.
            exact_updates += (mut.get("exact_matches") or 0) if isinstance(mut, dict) else 0
            if isinstance(mut, dict) and mut.get("nudged"):
                nudge_updates += 1
            # Freshness telemetry: a successful scrape keeps the product "ok".
            try:
                if not DRY_RUN:
                    record_freshness(product["_id"], "ok")
            except Exception as e:
                print(f"    freshness write failed: {e}")
            _review(product["_id"], False)

        except Exception as e:
            import traceback as _tb
            _tb.print_exc()
            failed_mutations += 1
            try:
                _emit_row(product, "ERROR", source=source if 'source' in dir() else None,
                          old_price=old_price if 'old_price' in dir() else None,
                          new_price=None, reason=f"unhandled_exception:{e}")
            except Exception:
                pass
            try:
                _review(product["_id"], True)
            except Exception:
                pass
            try:
                _log_invalid(product, "unhandled_exception", "")
            except Exception:
                pass
            continue
    print(
        "\n"
        "+--------------------------------------------------- Price Sync Summary ----+\n"
        "| Metric                   | Count                                |\n"
        "+--------------------------+-------------------------------------+\n"
        f"| Checked                  | {checked:<36}|\n"
        f"| Updated                  | {updated_count:<36}|\n"
        f"| Exact variant matches    | {exact_updates:<36}|\n"
        f"| Fallback nudges          | {nudge_updates:<36}|\n"
        f"| Matched (no change)      | {matched:<36}|\n"
        f"| Locked (skipped)         | {skipped_locked:<36}|\n"
        f"| Draft disabled (skip)    | {skipped_disabled:<36}|\n"
        f"| Fresh (delta-skip)       | {skipped_fresh:<36}|\n"
        f"| No URL                   | {skipped_no_url:<36}|\n"
        f"| URL name mismatch        | {skipped_url_mismatch:<36}|\n"
        f"| URL color mismatch       | {skipped_color_mismatch:<36}|\n"
        f"| Out of band              | {skipped_implausible:<36}|\n"
        f"| Implausible delta        | {skipped_dry:<36}|\n"
        f"| Scrape failed            | {skipped_no_price:<36}|\n"
        f"| Blocked (bot-wall)       | {scrape_blocked:<36}|\n"
        f"| Mutation failures        | {failed_mutations:<36}|\n"
        f"| Recovered (re-search)    | {recovered:<36}|\n"
        f"| Invalid URLs logged      | {invalid_urls:<36}|\n"
        "+--------------------------+-------------------------------------+"
    )

    if failed_mutations or invalid_urls:
        print(
            f"[ATTENTION] {failed_mutations} mutation failure(s) and "
            f"{invalid_urls} invalid URL(s) — the workflow will exit non-zero."
        )

    return {
        "checked": checked,
        "updated": updated_count,
        "exact_updates": exact_updates,
        "nudge_updates": nudge_updates,
        "matched": matched,
        "failed_mutations": failed_mutations,
        "invalid_urls": invalid_urls,
        "recovered": recovered,
        "scrape_blocked": scrape_blocked,
        "skipped_color_mismatch": skipped_color_mismatch,
        "skipped_fresh": skipped_fresh,
    }


# ─── New-launch scanner ─────────────────────────────────────────────────────

def _source_for_brand_slug(brand_slug: str) -> str | None:
    return _SLUG_TO_SOURCE.get(brand_slug)


def check_launches(dry_run: bool = False):
    print(f"Checking for new launches...{' (DRY RUN)' if dry_run else ''}")
    existing = fetch_all_products()
    existing_names = [p.get("name", "") for p in existing]

    added = 0
    for brand_slug in TRACKED_BRAND_SLUGS:
        source = _source_for_brand_slug(brand_slug)
        if source is None:
            continue
        # A "both" brand must be scanned on Flipkart AND Amazon for new
        # launches; expand it into per-platform scans.
        platforms = ["flipkart", "amazon"] if source == "both" else [source]
        for platform in platforms:
            # We don't have the brand's display name from the listings
            # endpoint, but the search query uses the slug anyway.
            print(f"  Scanning brand slug '{brand_slug}' on {platform}...")
            try:
                listings = get_brand_listings(brand_slug, platform)
            except Exception as e:
                print(f"    ERROR fetching listings for {brand_slug}: {e}")
                continue

            for name, url in listings:
                if any(is_match(name, ex) for ex in existing_names):
                    continue

                details = (
                    get_flipkart_details(url) if platform == "flipkart"
                    else get_amazon_details(url)
                )
                price = details.get("price")
                if price is not None and not price_in_bounds(price):
                    print(f"    SKIP {name}: implausible price Rs{price}")
                    continue

                if dry_run:
                    print(f"    [DRY RUN] would add: {name} ({brand_slug}) {url}")
                else:
                    res = create_full_product(name, brand_slug, platform, url, details)
                    if res is None:
                        print(f"    SKIP {name}: could not create (brand missing?)")
                        continue
                    print(f"    + added draft: {name} ({brand_slug})")

                added += 1

    print(f"[OK] Found/added {added} new phone(s).")
    return added


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str, required=True, choices=["sync", "launch"])
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--brands", type=str, default=None,
        help="Comma-separated brand slugs to limit the sync (e.g. samsung,iqoo). "
             "Useful for a fast targeted live validation instead of all 135 products.",
    )
    args = parser.parse_args()
    if args.mode == "sync":
        brands = [b for b in args.brands.split(",")] if args.brands else None
        try:
            summary = sync_prices(dry_run=args.dry_run, brands=brands)
        except Exception as e:  # never let an unexpected crash break the whole run
            import traceback
            traceback.print_exc()
            print(f"::error::Price sync crashed: {e}")
            sys.exit(2)
        # Hard failure = a Sanity mutation actually failed (price write / URL
        # patch). That is a real problem and MUST turn the Action red.
        # A fully-bot-blocked run (0 mutations, 0 writes) is expected on
        # GitHub's shared IPs and is treated as a warning, not a failure —
        # the next 6h cycle retries automatically.
        failed = summary.get("failed_mutations", 0) + summary.get("invalid_urls", 0)
        if failed > 0:
            print(f"::error::{failed} hard failure(s) during price sync "
                  f"(mutation/URL write).")
            sys.exit(1)
        if summary.get("scrape_blocked", 0) > 0:
            print(f"::warning::{summary['scrape_blocked']} product(s) bot-blocked "
                  f"this cycle; will retry next run.")
    elif args.mode == "launch":
        check_launches(dry_run=args.dry_run)
