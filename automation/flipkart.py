import re
import time
import random
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Cache-Control": "no-cache",
}

# How many times to retry the requests/Playwright pass. Each pass already
# has its own internal delay+jitter between attempts.
REQUEST_RETRIES = 3
PLAYWRIGHT_RETRIES = 2


def get_flipkart_price(url: str) -> int | None:
    if not url:
        return None

    for attempt in range(1, REQUEST_RETRIES + 1):
        price = _try_requests(url, attempt)
        if price is not None:
            return price
        # Small exponential-ish backoff before re-trying requests, then later
        # falling to Playwright. cap sleeps so we don't blow the 6h budget.
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
        time.sleep(random.uniform(1, 2))
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            print(f"  Flipkart requests: HTTP {resp.status_code} (attempt {attempt})")
            return None

        html = resp.text
        soup = BeautifulSoup(html, "lxml")

        # Strategy 1: JSON-LD structured data (most reliable)
        price = _extract_jsonld_price(soup)
        if price:
            return price

        # Strategy 2: Common Flipkart product card price selectors — only on a
        # genuine product page. Flipkart serves a "Robot Check" / consent
        # interstitial to bot-like traffic; its stray price widget would
        # otherwise be mistaken for the product price.
        if _is_flipkart_product_page(soup):
            price = _extract_card_price(soup)
            if price:
                return price

        # No reliable price found — DO NOT fall back to the first "₹" in the
        # HTML, as that often captures a variant, accessory, or sponsored price.
        return None

    except requests.RequestException as e:
        print(f"  Flipkart requests error (attempt {attempt}): {e}")
        return None


def _is_flipkart_product_page(soup: BeautifulSoup) -> bool:
    """Return True only if `soup` looks like a real Flipkart product page.

    Bot-check / consent interstitials served to datacenter IPs lack a product
    JSON-LD block and the `_1AtVbE` product-info container, so we refuse to
    trust their card-price widgets.
    """
    if soup.find("div", class_="_1AtVbE") or soup.find("h1"):
        return True
    # A product JSON-LD block is itself proof of a real page.
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
    import json

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
            # Prefer the actual Product / AggregateOffer block
            if item.get("@type") in ("Product", "AggregateOffer") or "offers" in item:
                price = _get_offers_price(item)
                if price:
                    candidates.append(price)

    # Return the first Product-type price we found
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


def _extract_card_price(soup: BeautifulSoup) -> int | None:
    SELECTORS = [
        "div.Nx9bqj",
        "div._30jeq3",
        "span._30jeq3",
        "div.cN1AAd",
        "div[class*='_30jeq3']",
        "div[class*='Nx9bqj']",
        "div._4b5DiR",
        "div[class*='_4b5DiR']",
    ]
    for sel in SELECTORS:
        el = soup.select_one(sel)
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
            context = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                viewport={"width": 1366, "height": 768},
                locale="en-IN",
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
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

                # Prefer JSON-LD from the fully-rendered page
                pw_soup = BeautifulSoup(page.content(), "lxml")
                price = _extract_jsonld_price(pw_soup)
                if price:
                    return price

                # Only trust card selectors on a genuine product page (see
                # _is_flipkart_product_page).
                if not _is_flipkart_product_page(pw_soup):
                    return None

                SELECTORS = [
                    "div.Nx9bqj",
                    "div._30jeq3",
                    "div[class*='_30jeq3']",
                    "span._30jeq3",
                    "div.cN1AAd",
                ]

                for sel in SELECTORS:
                    try:
                        price_el = page.wait_for_selector(sel, timeout=8000)
                        if price_el:
                            text = price_el.inner_text()
                            digits = re.sub(r"[^\d]", "", text)
                            if digits:
                                return int(digits)
                    except PwTimeout:
                        continue

                return None

            except Exception as e:
                print(f"  Flipkart Playwright error (attempt {attempt}): {e}")
                return None
            finally:
                browser.close()

    except ImportError:
        print("  Playwright not available, skipping fallback")
        return None


def get_flipkart_details(url: str) -> dict:
    """Fetch full product details (price, images, specs, colors, variants)
    with the same retry+Playwright fallback as `get_flipkart_price`.
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
    """Single-request attempt to scrape full Flipkart product details.

    Returns a parsed details dict on a 200 response from a genuine
    product page, or None on network errors, non-200 responses, or
    bot-check/CAPTCHA interstitials so the caller retries or falls
    through to Playwright.
    """
    try:
        time.sleep(random.uniform(1, 2))
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            print(f"  Flipkart details requests: HTTP {resp.status_code} (attempt {attempt})")
            return None

        soup = BeautifulSoup(resp.text, "lxml")

        # Reject bot-check / CAPTCHA interstitials that return HTTP 200
        # but aren't real product pages. Without this guard the parser
        # returns a truthy dict with empty fields and the retry loop
        # bails out early — defeating the whole purpose of retries.
        if not _is_flipkart_product_page(soup):
            print(f"  Flipkart details: not a product page (attempt {attempt})")
            return None

        details = _parse_flipkart_details(resp.text)
        return details
    except requests.RequestException as e:
        print(f"  Flipkart details requests error (attempt {attempt}): {e}")
        return None


def _try_playwright_details(url: str, attempt: int = 1) -> dict | None:
    """Playwright-based fallback to scrape full Flipkart product details.

    Renders the page in a headless Chromium, then parses the final HTML
    so that JS-rendered content (common with Flipkart's dynamic pages) is
    captured.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                viewport={"width": 1366, "height": 768},
                locale="en-IN",
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
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

                pw_html = page.content()
                details = _parse_flipkart_details(pw_html)
                return details

            except Exception as e:
                print(f"  Flipkart details Playwright error (attempt {attempt}): {e}")
                return None
            finally:
                browser.close()

    except ImportError:
        print("  Playwright not available, skipping details fallback")
        return None


def _parse_flipkart_details(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    price = _extract_jsonld_price(soup)
    return {
        "price": price,
        "images": _extract_flipkart_images(soup),
        "description": _extract_flipkart_description(soup),
        "specifications": _extract_flipkart_specs(soup),
        "colors": _extract_flipkart_colors(soup),
        "variants": _extract_flipkart_variants(soup),
    }


def _extract_flipkart_images(soup: BeautifulSoup) -> list:
    imgs = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        if src.startswith("http") and ("rukminim" in src or "fkimg" in src):
            if src not in imgs:
                imgs.append(src)
    return imgs


def _extract_flipkart_description(soup: BeautifulSoup):
    el = soup.find("div", class_=lambda c: c and "description" in c.lower())
    if el:
        return el.get_text(" ", strip=True)
    meta = soup.find("meta", attrs={"name": "description"})
    if meta and meta.get("content"):
        return meta["content"].strip()
    return None


def _extract_flipkart_specs(soup: BeautifulSoup) -> list:
    specs = []
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                label = cells[0].get_text(" ", strip=True)
                value = cells[1].get_text(" ", strip=True)
                if label and value and label.lower() != value.lower():
                    specs.append({"label": label, "value": value})
    seen = set()
    out = []
    for s in specs:
        key = (s["label"], s["value"])
        if key not in seen:
            seen.add(key)
            out.append(s)
    return out


def _extract_flipkart_colors(soup: BeautifulSoup) -> list:
    colors = []
    for el in soup.find_all("div", class_=lambda c: c and "color" in c.lower()):
        style = el.get("style", "")
        name = el.get("title") or el.get("data-color") or el.get_text(strip=True)
        hex_match = re.search(r"#([0-9a-fA-F]{6})", style)
        hexv = "#" + hex_match.group(1) if hex_match else None
        if name:
            colors.append({"name": name, "hex": hexv})
    return colors


def _extract_flipkart_variants(soup: BeautifulSoup) -> list:
    variants = []
    for el in soup.find_all(string=re.compile(r"\d+\s*GB\s*/\s*\d+\s*GB", re.I)):
        m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", el, re.I)
        if m:
            variants.append(
                {"ram": f"{m.group(1)} GB", "storage": f"{m.group(2)} GB", "price": None}
            )
    seen = set()
    out = []
    for v in variants:
        key = (v["ram"], v["storage"])
        if key not in seen:
            seen.add(key)
            out.append(v)
    return out
