import re
import time
import random
import json
import requests
from bs4 import BeautifulSoup

from http_helper import new_session, get_with_retry, is_interstitial, random_user_agent

REQUEST_RETRIES = 3
PLAYWRIGHT_RETRIES = 2


def get_amazon_price(url: str) -> int | None:
    if not url:
        return None

    for attempt in range(1, REQUEST_RETRIES + 1):
        price = _try_requests(url, attempt)
        if price is not None:
            return price
        if attempt < REQUEST_RETRIES:
            time.sleep(min(2 ** attempt, 8))

    for attempt in range(1, PLAYWRIGHT_RETRIES + 1):
        price = _try_playwright(url, attempt)
        if price is not None:
            return price
        if attempt < PLAYWRIGHT_RETRIES:
            time.sleep(2)
    return None


def _try_requests(url: str, attempt: int = 1) -> int | None:
    try:
        session = new_session()
        resp = get_with_retry(session, url, timeout=30, max_tries=2)
        if resp is None:
            return None

        html = resp.text
        soup = BeautifulSoup(html, "lxml")

        # Strategy 1: JSON-LD structured data (most reliable)
        price = _extract_jsonld_price(soup)
        if price:
            return price

        # Strategy 2: Standard Amazon price selectors — BUT only on a genuine
        # product page. Amazon frequently serves a "Robot Check" / CAPTCHA
        # interstitial (a tiny page, no #productTitle) to datacenter IPs such
        # as GitHub Actions runners. That page still contains a stray
        # `.a-price` widget, so blindly reading it returns a bogus price
        # (e.g. ₹279 for a ₹37,999 phone). Refuse to trust card selectors
        # unless the product title element is present.
        if _is_amazon_product_page(soup):
            price = _extract_card_price(soup)
            if price:
                return price

        # No reliable price found — DO NOT fall back to the first "₹" in the
        # HTML, as that often captures a variant, accessory, sponsored, or
        # bot-check page price.
        return None

    except requests.RequestException as e:
        print(f"  Amazon requests error (attempt {attempt}): {e}")
        return None


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
            page.set_default_timeout(60000)

            try:
                page.goto(url, wait_until="commit", timeout=60000)
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
        resp = get_with_retry(session, url, timeout=30, max_tries=2)
        if resp is None:
            return None

        soup = BeautifulSoup(resp.text, "lxml")

        # Reject bot-check / CAPTCHA interstitials that return HTTP 200
        # but aren't real product pages. Without this guard the parser
        # returns a truthy dict with empty fields and the retry loop
        # bails out early — defeating the whole purpose of retries.
        if not _is_amazon_product_page(soup):
            print(f"  Amazon details: not a product page (attempt {attempt})")
            return None

        details = _parse_amazon_details(resp.text)
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
            page.set_default_timeout(60000)

            try:
                page.goto(url, wait_until="commit", timeout=60000)
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
                text_variants[key] = {"ram": key[0], "storage": key[1], "price": None}

    # ── Strategy 2: JSON-LD offers (structured data with real prices) ──
    ld_variants = _extract_variants_from_jsonld(soup)
    for v in ld_variants:
        key = (v["ram"], v["storage"])
        text_variants[key] = v  # JSON-LD price (may be None) overwrites

    return list(text_variants.values())


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
                        })

    # Deduplicate (JSON-LD may list the same variant multiple times)
    seen = {}
    out = []
    for v in variants:
        key = (v["ram"], v["storage"])
        if key not in seen or seen[key]["price"] is None:
            seen[key] = v
    return list(seen.values())
