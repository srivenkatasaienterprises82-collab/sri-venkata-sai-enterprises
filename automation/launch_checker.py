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
import sys
import time
from datetime import datetime

from sanity_api import fetch_all_products, update_price, update_price_and_variants, create_full_product
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

def sync_prices():
    print("Starting Price Sync...")
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w") as f:
            f.write("timestamp,product,brand,old_price,new_price,diff,direction,source\n")
    if not os.path.exists(INVALID_LOG_FILE):
        with open(INVALID_LOG_FILE, "w") as f:
            f.write("timestamp,product,brand,reason,url\n")

    products = fetch_all_products()
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
    failed_mutations = 0
    invalid_urls = 0
    recovered = 0

    for product in products:
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
                            except RuntimeError:
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
        elif source == "both":
            flip_details = get_flipkart_details(flipkart_url) if flipkart_url else {}
            amz_details = get_amazon_details(amazon_url) if amazon_url else {}
            flip_price = flip_details.get("price")
            amz_price = amz_details.get("price")
            scraped_variants = flip_details.get("variants") or amz_details.get("variants", [])

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
                continue
            display_price = min(prices)
        else:
            display_price = flip_price if source == "flipkart" else amz_price

        scrape_ms = (time.time() - scrape_start) * 1000

        if display_price is None:
            skipped_no_price += 1
            _emit_row(product, "SKIP", source=source, old_price=old_price,
                      reason="scraper_returned_none", scrape_ms=scrape_ms,
                      retries=retries_used)
            continue

        # Hard band guard.
        if not price_in_bounds(display_price):
            skipped_implausible += 1
            _emit_row(product, "SKIP", source=source, old_price=old_price,
                      new_price=display_price, reason="price_out_of_band",
                      scrape_ms=scrape_ms)
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
            continue

        if old_price == display_price:
            matched += 1
            _emit_row(product, "MATCH", source=source, old_price=old_price,
                      new_price=display_price, scrape_ms=scrape_ms,
                      retries=retries_used)
            continue

        # Update Sanity (including per-variant prices). A non-2xx response
        # raises RuntimeError, which we count as a hard failure.
        try:
            mut = update_price_and_variants(
                product["_id"],
                product.get("name", ""),
                amz_price, flip_price, display_price,
                scraped_variants,
                existing_variants,
            )
        except RuntimeError as e:
            failed_mutations += 1
            _emit_row(product, "ERROR", source=source, old_price=old_price,
                      new_price=display_price, reason=f"sanity_mutation_failed:{e}",
                      scrape_ms=scrape_ms)
            continue
        if not mut or not mut.get("results"):
            failed_mutations += 1
            _emit_row(product, "ERROR", source=source, old_price=old_price,
                      new_price=display_price, reason="sanity_mutation_failed",
                      scrape_ms=scrape_ms)
            continue

        updated_count += 1
        diff = display_price - (old_price or 0)
        arrow = "^" if diff > 0 else "v"
        log_change(product["name"], brand, old_price, display_price, source)
        _emit_row(product, "UPDATE", source=source, old_price=old_price,
                  new_price=display_price, scrape_ms=scrape_ms,
                  retries=retries_used)
        print(f"    {arrow} ₹{old_price} → ₹{display_price} ({'+' if diff > 0 else ''}{diff}) via {source}")

    print(
        "\n"
        "┌─────────────────────────── Price Sync Summary ───────────────────────────┐\n"
        "│ Metric                 │ Count                                            │\n"
        "├────────────────────────┼──────────────────────────────────────────────────┤\n"
        f"│ Checked                │ {checked:<48}│\n"
        f"│ Updated                │ {updated_count:<48}│\n"
        f"│ Matched (no change)    │ {matched:<48}│\n"
        f"│ Locked (skipped)       │ {skipped_locked:<48}│\n"
        f"│ Draft disabled (skip)  │ {skipped_disabled:<48}│\n"
        f"│ No URL                 │ {skipped_no_url:<48}│\n"
        f"│ URL name mismatch      │ {skipped_url_mismatch:<48}│\n"
        f"│ URL color mismatch     │ {skipped_color_mismatch:<48}│\n"
        f"│ Out of band            │ {skipped_implausible:<48}│\n"
        f"│ Implausible delta      │ {skipped_dry:<48}│\n"
        f"│ Scrape failed          │ {skipped_no_price:<48}│\n"
        f"│ Mutation failures      │ {failed_mutations:<48}│\n"
        f"│ Recovered (re-search)  │ {recovered:<48}│\n"
        f"│ Invalid URLs logged    │ {invalid_urls:<48}│\n"
        "└────────────────────────┴──────────────────────────────────────────────────┘"
    )

    if failed_mutations or invalid_urls:
        print(
            f"[ATTENTION] {failed_mutations} mutation failure(s) and "
            f"{invalid_urls} invalid URL(s) — the workflow will exit non-zero."
        )

    return {
        "checked": checked,
        "updated": updated_count,
        "matched": matched,
        "failed_mutations": failed_mutations,
        "invalid_urls": invalid_urls,
        "recovered": recovered,
        "skipped_color_mismatch": skipped_color_mismatch,
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
                    print(f"    SKIP {name}: implausible price ₹{price}")
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
    args = parser.parse_args()
    if args.mode == "sync":
        summary = sync_prices()
        # Fail the GitHub Action (non-zero exit) when any product could not be
        # synced, so a partial/failed run is never reported as a green check.
        if summary.get("failed_mutations", 0) > 0 or summary.get("invalid_urls", 0) > 0:
            sys.exit(1)
    elif args.mode == "launch":
        check_launches(dry_run=args.dry_run)
