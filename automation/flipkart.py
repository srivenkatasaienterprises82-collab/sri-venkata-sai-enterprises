import re
from playwright.sync_api import sync_playwright


def get_flipkart_price(url: str) -> int | None:
    if not url:
        return None
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            price_el = page.query_selector("div.Nx9bqj")
            if price_el:
                price_str = price_el.inner_text().replace(",", "").replace("₹", "")
                return int(re.sub(r"[^\d]", "", price_str))
        except Exception as e:
            print(f"Flipkart Error for {url}: {e}")
        finally:
            browser.close()
    return None
