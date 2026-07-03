import re
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout


def get_flipkart_price(url: str) -> int | None:
    if not url:
        return None

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1366, "height": 768},
            locale="en-IN",
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        page = context.new_page()

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            # Wait for any price element to appear (search pages load prices via JS)
            SELECTORS = [
                "div.Nx9bqj",           # product card price on search results
                "div._30jeq3",          # alternate search-card price
                "div[class*='_30jeq3']",  # class-prefix fallback
                "span._30jeq3",         # span variant on search cards
                "div.cN1AAd",           # alternate Flipkart price container
                "div[class*='cN1AAd']",
                "div[class*='Nx9bqj']",
            ]

            price_el = None
            for sel in SELECTORS:
                try:
                    price_el = page.wait_for_selector(sel, timeout=8000)
                    if price_el:
                        break
                except PwTimeout:
                    continue

            if not price_el:
                return None

            price_str = price_el.inner_text().replace(",", "").replace("₹", "").strip()
            digits = re.sub(r"[^\d]", "", price_str)
            if not digits:
                return None
            return int(digits)

        except Exception as e:
            print(f"Flipkart Error for {url}: {e}")
            return None
        finally:
            browser.close()
