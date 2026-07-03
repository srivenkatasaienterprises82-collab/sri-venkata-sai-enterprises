import re
import time
import random
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout


def get_amazon_price(url: str) -> int | None:
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
        page.set_default_timeout(120000)

        try:
            page.goto(url, wait_until="commit", timeout=120000)
            time.sleep(random.uniform(2, 4))

            try:
                page.wait_for_load_state("networkidle", timeout=30000)
            except PwTimeout:
                pass

            SELECTORS = [
                "span.a-price-whole",
                "span.a-price",
                "span[class*='a-price'] span.a-price-whole",
                "#priceblock_ourprice",
                "#priceblock_dealprice",
                ".a-price .a-offscreen",
            ]

            price_el = None
            for sel in SELECTORS:
                try:
                    price_el = page.wait_for_selector(sel, timeout=10000)
                    if price_el:
                        break
                except PwTimeout:
                    continue

            if not price_el:
                return None

            whole_text = price_el.inner_text().replace(",", "").replace("₹", "").strip()
            digits = re.sub(r"[^\d]", "", whole_text)
            if not digits:
                return None
            return int(digits)

        except Exception as e:
            print(f"Amazon Error for {url}: {e}")
            return None
        finally:
            browser.close()
