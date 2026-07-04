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


def get_flipkart_price(url: str) -> int | None:
    if not url:
        return None

    # Try requests + BeautifulSoup first (faster, lighter)
    price = _try_requests(url)
    if price is not None:
        return price

    # Fall back to Playwright
    price = _try_playwright(url)
    return price


def _try_requests(url: str) -> int | None:
    try:
        time.sleep(random.uniform(1, 2))
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            return None

        html = resp.text
        soup = BeautifulSoup(html, "lxml")

        # Strategy 1: JSON-LD structured data (most reliable)
        price = _extract_jsonld_price(soup)
        if price:
            return price

        # Strategy 2: Common Flipkart product card price selectors
        price = _extract_card_price(soup)
        if price:
            return price

        # Strategy 3: First price-like number near ₹ in the HTML
        price = _extract_first_price_in_html(html)
        if price:
            return price

        return None

    except requests.RequestException as e:
        print(f"  Flipkart requests error: {e}")
        return None


def _extract_jsonld_price(soup: BeautifulSoup) -> int | None:
    for script in soup.find_all("script", type="application/ld+json"):
        import json

        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                for item in data:
                    price = _get_offers_price(item)
                    if price:
                        return price
            elif isinstance(data, dict):
                price = _get_offers_price(data)
                if price:
                    return price
        except (json.JSONDecodeError, AttributeError):
            continue
    return None


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


def _extract_first_price_in_html(html: str) -> int | None:
    patterns = [
        r"₹\s*([0-9,]+(?:\.\d{2})?)",
        r"Rs\.\s*([0-9,]+(?:\.\d{2})?)",
        r"\"price\"\s*:\s*(\d+)",
    ]
    for pattern in patterns:
        matches = re.findall(pattern, html)
        if matches:
            raw = matches[0]
            digits = re.sub(r"[^\d]", "", raw)
            if digits and int(digits) > 100:  # Skip tiny numbers (not prices)
                return int(digits)
    return None


def _try_playwright(url: str) -> int | None:
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
                print(f"  Flipkart Playwright error: {e}")
                return None
            finally:
                browser.close()

    except ImportError:
        print("  Playwright not available, skipping fallback")
        return None
