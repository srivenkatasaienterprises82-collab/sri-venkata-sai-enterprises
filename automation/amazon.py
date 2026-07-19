import re
import time
import random
import json
import requests
from bs4 import BeautifulSoup

from http_helper import (
    new_session,
    get_with_retry,
    is_interstitial,
    random_user_agent,
)
from fetch_manager import FetchManager
from parser import dom_fingerprint, vote, confident_price

try:
    from playwright_stealth import stealth_sync
    STEALTH_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    stealth_sync = None
    STEALTH_AVAILABLE = False

REQUEST_RETRIES = 3
PLAYWRIGHT_RETRIES = 2

# Domain used when exporting the warmed Playwright cookies back into the HTTP
# session. Amazon sets clearance cookies on this host.
AZ_DOMAIN = "amazon.in"
AZ_BASE = "https://www.amazon.in/"

# One FetchManager per process (keeps the cookie cache / proxy config shared).
_fm = FetchManager(AZ_DOMAIN, AZ_BASE,
                   http_retries=REQUEST_RETRIES, browser_retries=PLAYWRIGHT_RETRIES)


def get_amazon_price(url: str) -> int | None:
    """Fetch via the central FetchManager, then run the deterministic
    multi-strategy parser with a confidence gate (items 1-3, 10-12)."""
    if not url:
        return None

    outcome = _fm.fetch(url)
    if not outcome.ok:
        print(f"    Amazon fetch failed: {outcome.failure} ({outcome.legs})")
        return None

    soup = BeautifulSoup(outcome.html, "lxml")
    fp = dom_fingerprint(outcome.html)
    is_product = _is_amazon_product_page(soup)
    if not is_product:
        print(f"    Amazon: not a genuine product page (fp={fp}); skipping")
        return None

    candidates = [
        ("jsonld", _extract_jsonld_price(soup)),
        ("card_css", _extract_card_price(soup)),
    ]
    result = vote(candidates, is_product_page=is_product, fingerprint=fp)
    print(f"    Amazon parse: {result.reason}")
    price = confident_price(result)
    if price is None:
        print(f"    Amazon: confidence {result.confidence:.2f} < gate; dropping")
    return price


def _is_amazon_product_page(soup: BeautifulSoup) -> bool:
    """Return True only if `soup` looks like a real Amazon product page.

    The strongest single signal is the product title element (#productTitle),
    which is absent on "Robot Check" / CAPTCHA / redirect interstitials that
    Amazon serves to bot-like traffic. Without this guard the card-price
    extractor happily returns a stray sponsored/sidebar price.
    """
    if soup.find("span", id="productTitle") or soup.find(id="productTitle"):
        return True
    # Fallback: a product JSON-LD block already establishes a real page, but
    # if we reach here it didn't yield a price — still accept a page that
    # carries the offers microdata as product-shaped.
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
        except (json.JSONDecodeError, AttributeError):
            continue
        items = data if isinstance(data, list) else [data]
        if any(
            isinstance(it, dict)
            and (it.get("@type") in ("Product", "AggregateOffer") or "offers" in it)
            for it in items
        ):
            return True
    return False


def _extract_jsonld_price(soup: BeautifulSoup) -> int | None:
    candidates = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
        except (json.JSONDecodeError, AttributeError):
            continue

        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") in ("Product", "AggregateOffer") or "offers" in item:
                price = _get_offers_price(item)
                if price:
                    candidates.append(price)

    return candidates[0] if candidates else None


def _get_offers_price(data: dict) -> int | None:
    offers = data.get("offers")
    if not offers:
        return None
    if isinstance(offers, dict):
        price_str = offers.get("price", "")
        if price_str:
            digits = re.sub(r"[^\d]", "", str(price_str))
            if digits:
                return int(digits)
    elif isinstance(offers, list):
        for offer in offers:
            price_str = offer.get("price", "")
            if price_str:
                digits = re.sub(r"[^\d]", "", str(price_str))
                if digits:
                    return int(digits)
    return None


# Containers that hold the MAIN buy-box price. We only ever read a price from
# inside one of these. Matching ".a-price-whole" / ".a-offscreen" globally is
# unsafe: those classes also decorate every "Sponsored" / "Similar products"
# carousel widget on the page, so the first match is frequently a DIFFERENT
# product's price (e.g. ₹279 for a ₹37,999 phone). Scoping to the buy box is
# what keeps the storefront from displaying a wrong number.
BUYBOX_SCOPES = [
    "#corePrice_desktop",
    "#desktop_unifiedPrice",
    "#unifiedPrice_feature_div",
    "#corePriceDisplay_feature_div",
    "#corePriceDisplay_desktop_feature_div",
    "#buybox",
    "#desktop_buybox",
]


def _extract_card_price(soup: BeautifulSoup) -> int | None:
    for scope in BUYBOX_SCOPES:
        box = soup.select_one(scope)
        if not box:
            continue
        for sel in (
            "span.a-price-whole",
            "span.a-offscreen",
            ".a-price .a-offscreen",
            "#priceblock_ourprice",
            "#priceblock_dealprice",
        ):
            el = box.select_one(sel)
            if el:
                text = el.get_text(strip=True)
                digits = re.sub(r"[^\d]", "", text)
                if digits:
                    return int(digits)
    return None


def _try_playwright(url: str, attempt: int = 1) -> int | None:
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ua = random_user_agent()
            context = browser.new_context(
                user_agent=ua,
                viewport={"width": random.choice([1366, 1440, 1536]), "height": 768},
                locale="en-IN",
                device_scale_factor=1,
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'languages', {get: () => ['en-IN','en']});"
            )
            page = context.new_page()
            if STEALTH_AVAILABLE:
                stealth_sync(page)
            page.set_default_timeout(60000)

            try:
                page.goto(url, wait_until="commit", timeout=20000)
                time.sleep(random.uniform(2, 3))
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except PwTimeout:
                    pass

                # Bail if Amazon served a "Robot Check" interstitial instead of
                # the product — its stray .a-price widget would be bogus.
                if is_interstitial(page.content()):
                    print(f"  Amazon Playwright: bot-check interstitial (attempt {attempt})")
                    return None

                # Prefer JSON-LD from the fully-rendered page
                pw_soup = BeautifulSoup(page.content(), "lxml")
                price = _extract_jsonld_price(pw_soup)
                if price:
                    return price

                # Only trust card selectors on a genuine product page (see
                # _is_amazon_product_page — bot-check interstitials would
                # otherwise yield a bogus price).
                if not _is_amazon_product_page(pw_soup):
                    return None

                # Give the buy-box price time to render, then read it ONLY from
                # the scoped buy-box region (never a global ".a-price-whole",
                # which matches sponsored/related carousels).
                try:
                    page.wait_for_selector(
                        "#corePrice_desktop .a-price-whole, "
                        "#desktop_unifiedPrice .a-price-whole, "
                        "#unifiedPrice_feature_div .a-price-whole",
                        timeout=15000,
                    )
                except PwTimeout:
                    pass
                pw_soup = BeautifulSoup(page.content(), "lxml")
                price = _extract_card_price(pw_soup)
                if price:
                    return price

                return None

            except Exception as e:
                print(f"  Amazon Playwright error (attempt {attempt}): {e}")
                return None
            finally:
                browser.close()

    except ImportError:
        print("  Playwright not available, skipping fallback")
        return None


def get_amazon_details(url: str) -> dict:
    """Fetch full product details (price, images, specs, colors, variants)
    with the same retry+Playwright fallback as `get_amazon_price`.
    """
    if not url:
        return {}

    for attempt in range(1, REQUEST_RETRIES + 1):
        details = _try_requests_details(url, attempt)
        if details:
            return details
        if attempt < REQUEST_RETRIES:
            time.sleep(min(2 ** attempt, 8))

    for attempt in range(1, PLAYWRIGHT_RETRIES + 1):
        details = _try_playwright_details(url, attempt)
        if details:
            return details
        if attempt < PLAYWRIGHT_RETRIES:
            time.sleep(2)
    return {}


def _try_requests_details(url: str, attempt: int = 1) -> dict | None:
    """Single-request attempt to scrape full Amazon product details.

    Returns a parsed details dict on a 200 response from a genuine
    product page, or None on network errors, non-200 responses, or
    bot-check/CAPTCHA interstitials so the caller retries or falls
    through to Playwright.
    """
    try:
        session = new_session()
        result = get_with_retry(session, url, timeout=30, max_tries=2)
        if not result.ok:
            return None

        soup = BeautifulSoup(result.html, "lxml")

        # Reject bot-check / CAPTCHA interstitials that return HTTP 200
        # but aren't real product pages. Without this guard the parser
        # returns a truthy dict with empty fields and the retry loop
        # bails out early — defeating the whole purpose of retries.
        if not _is_amazon_product_page(soup):
            print(f"  Amazon details: not a product page (attempt {attempt})")
            return None

        details = _parse_amazon_details(result.html)
        return details
    except requests.RequestException as e:
        print(f"  Amazon details requests error (attempt {attempt}): {e}")
        return None


def _try_playwright_details(url: str, attempt: int = 1) -> dict | None:
    """Playwright-based fallback to scrape full Amazon product details.

    Renders the page in a headless Chromium, then parses the final HTML
    so that JS-rendered content (common with Amazon's dynamic pages) is
    captured.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ua = random_user_agent()
            context = browser.new_context(
                user_agent=ua,
                viewport={"width": random.choice([1366, 1440, 1536]), "height": 768},
                locale="en-IN",
                device_scale_factor=1,
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'languages', {get: () => ['en-IN','en']});"
            )
            page = context.new_page()
            if STEALTH_AVAILABLE:
                stealth_sync(page)
            page.set_default_timeout(60000)

            try:
                page.goto(url, wait_until="commit", timeout=20000)
                time.sleep(random.uniform(2, 3))
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except PwTimeout:
                    pass

                if is_interstitial(page.content()):
                    print(f"  Amazon details Playwright: bot-check interstitial (attempt {attempt})")
                    return None

                pw_html = page.content()
                details = _parse_amazon_details(pw_html)
                # Tier 1: interact with the Twister variant widget to read the
                # REAL per-variant prices Amazon hides behind JS. This is the
                # only reliable way to get RAM/Storage-specific prices; the
                # static HTML only ever shows the default-variant price.
                twister_variants = _extract_amazon_variants_twister(page)
                if twister_variants:
                    merged = {(v["ram"], v["storage"]): v for v in details.get("variants", [])}
                    for v in twister_variants:
                        merged[(v["ram"], v["storage"])] = v
                    details["variants"] = list(merged.values())
                return details

            except Exception as e:
                print(f"  Amazon details Playwright error (attempt {attempt}): {e}")
                return None
            finally:
                browser.close()

    except ImportError:
        print("  Playwright not available, skipping details fallback")
        return None


def _parse_amazon_details(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    price = _extract_jsonld_price(soup)
    return {
        "price": price,
        "images": _extract_amazon_images(soup),
        "description": _extract_amazon_description(soup),
        "specifications": _extract_amazon_specs(soup),
        "colors": _extract_amazon_colors(soup),
        "variants": _extract_amazon_variants(soup),
    }


def _extract_amazon_images(soup: BeautifulSoup) -> list:
    imgs = []
    el = soup.find("img", id="landingImage") or soup.find("img", id="imgBlkFront")
    if el:
        src = el.get("src") or el.get("data-old-hires") or ""
        if src.startswith("http"):
            imgs.append(src)
    for img in soup.select("#altImages img, #imageBlockThumbs img"):
        src = img.get("src") or ""
        if src.startswith("http") and src not in imgs:
            imgs.append(src)
    return imgs


def _extract_amazon_description(soup: BeautifulSoup):
    el = soup.find("div", id="productDescription")
    if el:
        return el.get_text(" ", strip=True)
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        return meta["content"].strip()
    return None


def _extract_amazon_specs(soup: BeautifulSoup) -> list:
    specs = []
    for table in soup.find_all("table", id=lambda i: i and "techSpec" in i):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                label = cells[0].get_text(" ", strip=True)
                value = cells[1].get_text(" ", strip=True)
                if label and value:
                    specs.append({"label": label, "value": value})
    seen = set()
    out = []
    for s in specs:
        key = (s["label"], s["value"])
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


def _extract_amazon_colors(soup: BeautifulSoup) -> list:
    colors = []
    for el in soup.find_all("li", class_=lambda c: c and "swatch" in c.lower()):
        name = el.get("title") or el.get_text(strip=True)
        style = el.get("style", "")
        hex_match = re.search(r"#([0-9a-fA-F]{6})", style)
        hexv = "#" + hex_match.group(1) if hex_match else None
        if name:
            colors.append({"name": name, "hex": hexv})
    return colors


def _has_no_price(v: dict) -> bool:
    """True if a variant carries no per-variant price from any marketplace."""
    return (
        v.get("price") is None
        and v.get("flipkartPrice") is None
        and v.get("amazonPrice") is None
    )


def _extract_amazon_variants(soup: BeautifulSoup) -> list:
    """Extract RAM/Storage variant combos from the page HTML.

    Uses two strategies (merged, JSON-LD prices win):
      1. Text-pattern scan  — find "X GB / Y GB" patterns anywhere in text
         (yields variants with price=None for RAM/Storage combos).
      2. JSON-LD offers     — parse structured-data offers whose name/desc
         contains a RAM/Storage pattern, giving us per-variant prices.

    Returns a deduplicated list of {"ram", "storage", "price"} dicts.
    """
    # ── Strategy 1: text-pattern scan ──────────────────────────────────
    text_variants = {}
    for el in soup.find_all(string=re.compile(r"\d+\s*GB\s*/\s*\d+\s*GB", re.I)):
        m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", el, re.I)
        if m:
            key = (f"{m.group(1)} GB", f"{m.group(2)} GB")
            if key not in text_variants:
                # Emit BOTH `price` (legacy, used by the blend logic) and
                # `amazonPrice` (per-variant Amazon price for the new
                # variant-level schema). The orchestrator merges Flipkart
                # and Amazon variants by (ram, storage) so one variant can
                # carry both marketplace prices side-by-side.
                text_variants[key] = {"ram": key[0], "storage": key[1], "price": None, "amazonPrice": None}

    # ── Strategy 2: JSON-LD offers (structured data with real prices) ──
    ld_variants = _extract_variants_from_jsonld(soup)
    for v in ld_variants:
        key = (v["ram"], v["storage"])
        text_variants[key] = v  # JSON-LD price (may be None) overwrites

    return list(text_variants.values())


def _extract_amazon_variants_twister(page) -> list:
    """Read real per-variant RAM/Storage prices by driving the Twister widget.

    Amazon hides non-default variant prices behind JS: the static HTML shows
    only the selected variant's price. The Twister (`#twister`, `.twisterSlotDiv`)
    exposes a button per RAM/Storage combo; clicking it updates the buy-box
    price after a short render. We click each enabled button, read the scoped
    buy-box price, and map it back to its RAM/Storage label.

    Returns a list of {"ram", "storage", "price"} dicts (may be empty if the
    page has no Twister widget or all clicks fail). Never raises — a failure
    just means "no Twister prices", and the caller keeps its HTML-derived ones.
    """
    try:
        # Locate the Twister container. Amazon renders variant buttons either
        # as <li> rows inside #twister or as .twisterSlotDiv buttons.
        twister = page.query_selector("#twister")
        if twister is None:
            twister = page.query_selector(".twisterSlotDiv")
        if twister is None:
            return []

        # Each selectable variant button carries a data attribute or text that
        # names the RAM/Storage combo (e.g. "8GB RAM + 128GB storage").
        buttons = twister.query_selector_all(
            "li:not(.dropdownDisabled), span.twisterSlotDiv:not(.twisterSlotDiv_decorative), "
            "button:not([disabled])"
        )
        if not buttons:
            return []

        results = []
        seen = set()
        for btn in buttons:
            try:
                label = (btn.inner_text() or "").strip()
            except Exception:
                continue
            m = re.search(r"(\d+)\s*GB\s*(?:RAM)?\s*\+?\s*(\d+)\s*GB", label, re.I)
            if not m:
                continue
            ram = f"{m.group(1)} GB"
            storage = f"{m.group(2)} GB"
            if (ram, storage) in seen:
                continue
            try:
                btn.click()
            except Exception:
                continue
            # Wait for the buy-box price to re-render after the variant switch.
            time.sleep(1.5)
            price = _read_twister_price(page)
            if price is not None and 1000 <= price <= 300000:
                seen.add((ram, storage))
                results.append({"ram": ram, "storage": storage, "price": price, "amazonPrice": price})
        return results
    except Exception as e:
        print(f"  Amazon Twister extraction error: {e}")
        return []


def _read_twister_price(page) -> int | None:
    """Read the current buy-box price after a Twister variant switch.

    Scoped to the buy-box containers only (never a global `.a-price-whole`,
    which also decorates sponsored/related carousels and would return a
    DIFFERENT product's price).
    """
    for scope in BUYBOX_SCOPES:
        try:
            box = page.query_selector(scope)
        except Exception:
            box = None
        if box is None:
            continue
        for sel in (".a-price .a-offscreen", "span.a-price-whole", "#priceblock_ourprice",
                    "#priceblock_dealprice"):
            try:
                el = box.query_selector(sel)
            except Exception:
                el = None
            if el:
                text = el.inner_text()
                digits = re.sub(r"[^\d]", "", text or "")
                if digits:
                    return int(digits)
    return None


def _extract_variants_from_jsonld(soup: BeautifulSoup) -> list:
    """Parse JSON-LD structured data for multi-offer variant prices.

    Flipkart and Amazon both embed JSON-LD with an ``offers`` array when
    the product has multiple variants (RAM/Storage/Color). Each offer may
    include a ``name`` like "8 GB / 128 GB" and a ``price``.

    Returns a list of {"ram", "storage", "price"} dicts (may be empty).
    """
    variants = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            # json is already imported at module level
            data = json.loads(script.string)
        except (json.JSONDecodeError, AttributeError):
            continue

        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            if item.get("@type") not in ("Product", "AggregateOffer"):
                continue

            offers = item.get("offers")
            if not offers:
                continue

            # Normalise to list
            offer_list = offers if isinstance(offers, list) else [offers]

            for offer in offer_list:
                if not isinstance(offer, dict):
                    continue
                price_str = offer.get("price", "")
                digits = re.sub(r"[^\d]", "", str(price_str))
                price = int(digits) if digits else None

                # Try to get variant info from offer name or description
                offer_name = offer.get("name", "") or offer.get("description", "") or ""
                m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", str(offer_name), re.I)
                if m:
                    variants.append({
                        "ram": f"{m.group(1)} GB",
                        "storage": f"{m.group(2)} GB",
                        "price": price,
                        "amazonPrice": price,
                    })

                # Also check itemOffered (nested Product with same pattern)
                offered = offer.get("itemOffered") or {}
                if isinstance(offered, dict):
                    oname = offered.get("name", "") or ""
                    m2 = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", str(oname), re.I)
                    if m2:
                        variants.append({
                            "ram": f"{m2.group(1)} GB",
                            "storage": f"{m2.group(2)} GB",
                            "price": price,
                            "amazonPrice": price,
                        })

    # Deduplicate (JSON-LD may list the same variant multiple times)
    seen = {}
    out = []
    for v in variants:
        key = (v["ram"], v["storage"])
        if key not in seen or _has_no_price(seen[key]):
            seen[key] = v
    return list(seen.values())
