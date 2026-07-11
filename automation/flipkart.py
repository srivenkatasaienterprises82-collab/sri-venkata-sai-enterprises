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

        # No reliable price found — DO NOT fall back to the first "₹" in the
        # HTML, as that often captures a variant, accessory, or sponsored price.
        return None

    except requests.RequestException as e:
        print(f"  Flipkart requests error: {e}")
        return None


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

                # Prefer JSON-LD from the fully-rendered page
                price = _extract_jsonld_price(
                    BeautifulSoup(page.content(), "lxml")
                )
                if price:
                    return price

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


def get_flipkart_details(url: str) -> dict:
    if not url:
        return {}
    try:
        time.sleep(random.uniform(1, 2))
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            return {}
        return _parse_flipkart_details(resp.text)
    except requests.RequestException as e:
        print(f"  Flipkart detail error: {e}")
        return {}


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
