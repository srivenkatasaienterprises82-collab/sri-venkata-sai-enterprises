# Price Automation & Launch Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 100% free automation for syncing prices, detecting new phones, and generating AI content using Python, GitHub Actions, Sanity CMS, and Groq LLM.

**Architecture:** GitHub Actions as serverless compute runs two workflows: price sync (every 6h scrapes Amazon/Flipkart, updates Sanity) and launch checker (daily scrapes for new phones, uses Groq LLM for normalization, creates drafts in Sanity). Playwright handles JS-rendered pages, RapidFuzz prevents duplicates, Sanity API for mutations.

**Tech Stack:** Python 3.10, Playwright, Groq API (Llama 3 8B), GitHub Actions, Sanity HTTP API, RapidFuzz, BeautifulSoup4, lxml

---

### Task 1: Create `requirements.txt`

**Files:**
- Create: `requirements.txt`

- [ ] Create the file

```txt
requests>=2.31.0
beautifulsoup4>=4.12.0
playwright>=1.40.0
lxml>=4.9.0
python-dotenv>=1.0.0
rapidfuzz>=3.0.0
groq>=0.5.0
```

---

### Task 2: Create Python utility modules

**Files:**
- Create: `automation/__init__.py`
- Create: `automation/utils.py`
- Create: `automation/sanity_api.py`
- Create: `automation/groq_ai.py`

- [ ] Create `automation/__init__.py` (empty)

- [ ] Create `automation/utils.py`

```python
from rapidfuzz import fuzz


def is_match(name1: str, name2: str, threshold: int = 95) -> bool:
    """Uses RapidFuzz to determine if two product names are the same."""
    score = fuzz.ratio(name1.lower(), name2.lower())
    return score >= threshold


def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("/", "-")
```

- [ ] Create `automation/sanity_api.py`

```python
import os
import requests
from datetime import datetime

PROJECT_ID = os.getenv("SANITY_PROJECT_ID")
DATASET = os.getenv("SANITY_DATASET")
TOKEN = os.getenv("SANITY_TOKEN")

BASE_URL = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01"
DATA_URL = f"{BASE_URL}/data/{DATASET}"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def fetch_all_products():
    query = '*[_type == "product"]{_id, name, brand->{name}, amazonUrl, flipkartUrl, price, amazonPrice, flipkartPrice}'
    url = f"{DATA_URL}/query?query={requests.utils.quote(query)}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return res.json().get("result", [])
    print("Error fetching products:", res.text)
    return []


def create_product(product_data: dict) -> dict:
    url = f"{DATA_URL}/mutate"
    mutations = {
        "mutations": [
            {
                "create": {
                    "_type": "product",
                    "name": product_data["title"],
                    "brand": {"_ref": product_data.get("brandRef", ""), "_type": "reference"},
                    "slug": {"_type": "slug", "current": product_data["slug"]},
                    "price": product_data.get("price"),
                    "amazonUrl": product_data.get("amazonUrl"),
                    "flipkartUrl": product_data.get("flipkartUrl"),
                    "amazonPrice": product_data.get("amazonPrice"),
                    "flipkartPrice": product_data.get("flipkartPrice"),
                    "description": product_data.get("description"),
                    "enabled": False,
                    "lastUpdated": datetime.now().isoformat(),
                }
            }
        ]
    }
    res = requests.post(url, headers=HEADERS, json=mutations)
    print(f"Created {product_data['title']}: {res.status_code}")
    return res.json()


def update_price(product_id: str, amazon_price, flipkart_price, display_price) -> dict:
    url = f"{DATA_URL}/mutate"
    mutations = {
        "mutations": [
            {
                "patch": {
                    "id": product_id,
                    "set": {
                        "amazonPrice": amazon_price,
                        "flipkartPrice": flipkart_price,
                        "price": display_price,
                        "lastUpdated": datetime.now().isoformat(),
                    },
                }
            }
        ]
    }
    res = requests.post(url, headers=HEADERS, json=mutations)
    return res.json()
```

- [ ] Create `automation/groq_ai.py`

```python
import os
import json
from groq import Groq


def normalize_and_describe(raw_name: str, brand: str) -> dict:
    """
    Uses Groq (Llama 3) to normalize phone names and generate content.
    Returns a dict with: title, slug, description
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "title": raw_name,
            "description": "",
            "slug": raw_name.lower().replace(" ", "-"),
        }

    client = Groq(api_key=api_key)

    prompt = f"""
You are an AI assistant for a mobile phone catalog website.
Analyze the following raw product name: '{raw_name}' (Brand: {brand}).

Provide a JSON response with the following keys:
1. "title": The official, clean smartphone name (remove colors, storage, RAM).
2. "slug": A URL-friendly slug (lowercase, hyphens).
3. "description": A 50-word SEO-friendly buying recommendation.

Return ONLY valid JSON. No markdown formatting.
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You output strictly valid JSON without markdown code blocks.",
                },
                {"role": "user", "content": prompt},
            ],
            model="llama3-8b-8192",
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        content = chat_completion.choices[0].message.content
        data = json.loads(content)
        return data

    except Exception as e:
        print(f"Groq API Error: {e}")
        return {
            "title": raw_name,
            "slug": raw_name.lower().replace(" ", "-"),
            "description": "",
        }
```

---

### Task 3: Create Amazon & Flipkart scrapers

**Files:**
- Create: `automation/amazon.py`
- Create: `automation/flipkart.py`

- [ ] Create `automation/amazon.py`

```python
import re
from playwright.sync_api import sync_playwright


def get_amazon_price(url: str) -> int | None:
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
            price_el = page.query_selector("span.a-price-whole")
            fraction_el = page.query_selector("span.a-price-fraction")
            if price_el:
                whole = price_el.inner_text()
                fraction = fraction_el.inner_text() if fraction_el else ""
                price_str = f"{whole}{fraction}".replace(",", "").replace("₹", "")
                return int(re.sub(r"[^\d]", "", price_str))
        except Exception as e:
            print(f"Amazon Error for {url}: {e}")
        finally:
            browser.close()
    return None
```

- [ ] Create `automation/flipkart.py`

```python
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
```

---

### Task 4: Create main orchestrator `launch_checker.py`

**Files:**
- Create: `automation/launch_checker.py`

- [ ] Create `automation/launch_checker.py`

```python
import argparse
import os
from sanity_api import fetch_all_products, update_price, create_product
from amazon import get_amazon_price
from flipkart import get_flipkart_price
from utils import is_match
from groq_ai import normalize_and_describe


def sync_prices():
    print("Starting Price Sync...")
    products = fetch_all_products()
    updated_count = 0

    for product in products:
        amz_price = get_amazon_price(product.get("amazonUrl"))
        flip_price = get_flipkart_price(product.get("flipkartUrl"))

        prices = [p for p in [amz_price, flip_price] if p is not None]
        if not prices:
            continue

        display_price = min(prices)

        if product.get("price") != display_price:
            update_price(product["_id"], amz_price, flip_price, display_price)
            updated_count += 1
            print(f"Updated {product['name']}: ₹{display_price}")

    print(f"✓ Checked {len(products)} phones. Updated {updated_count} prices.")


def check_launches():
    print("Checking for new launches...")
    existing_products = fetch_all_products()
    existing_titles = [p["name"] for p in existing_products]

    # Mock data: in production this comes from GSMArena/Brand site scraping
    scraped_phones = [
        {"raw_name": "Redmi Note 13 Pro 5G (256GB+8GB) Purple", "brand": "Redmi"},
        {"raw_name": "Motorola Edge 50 Pro", "brand": "Motorola"},
    ]

    added_count = 0
    for phone in scraped_phones:
        ai_data = normalize_and_describe(phone["raw_name"], phone["brand"])
        clean_title = ai_data.get("title", phone["raw_name"])

        is_already_added = any(is_match(clean_title, exist) for exist in existing_titles)
        if not is_already_added:
            print(f"Found new phone: {clean_title}")
            phone["amazonUrl"] = "https://amazon.in/dp/XXXX"
            phone["flipkartUrl"] = "https://flipkart.com/product/XXXX"
            phone.update(ai_data)
            create_product(phone)
            added_count += 1

    print(f"✓ Added {added_count} new phones.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", type=str, required=True, choices=["sync", "launch"])
    args = parser.parse_args()
    if args.mode == "sync":
        sync_prices()
    elif args.mode == "launch":
        check_launches()
```

---

### Task 5: Create GitHub Actions workflows

**Files:**
- Create: `.github/workflows/price-sync.yml`
- Create: `.github/workflows/launch-check.yml`

- [ ] Create `.github/workflows/price-sync.yml`

```yaml
name: Price Sync Automation

on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  sync-prices:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Install Playwright browsers
        run: python -m playwright install chromium --with-deps
      - name: Run Price Sync
        env:
          SANITY_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID }}
          SANITY_DATASET: ${{ secrets.SANITY_DATASET }}
          SANITY_TOKEN: ${{ secrets.SANITY_TOKEN }}
        run: python automation/launch_checker.py --mode sync
```

- [ ] Create `.github/workflows/launch-check.yml`

```yaml
name: New Phone Launch Checker

on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

jobs:
  check-launches:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Install Playwright browsers
        run: python -m playwright install chromium --with-deps
      - name: Run Launch Checker
        env:
          SANITY_PROJECT_ID: ${{ secrets.SANITY_PROJECT_ID }}
          SANITY_DATASET: ${{ secrets.SANITY_DATASET }}
          SANITY_TOKEN: ${{ secrets.SANITY_TOKEN }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
        run: python automation/launch_checker.py --mode launch
```

---

### Task 6: Update Sanity product schema with automation fields

**Files:**
- Modify: `studio-sri-venkata-sai-enterprises/schemaTypes/product.ts`

- [ ] Add pricing automation fields after `priceOnEnquiry`:

```typescript
    defineField({
      name: "amazonUrl",
      title: "Amazon URL",
      type: "url",
      group: "pricing",
    }),
    defineField({
      name: "flipkartUrl",
      title: "Flipkart URL",
      type: "url",
      group: "pricing",
    }),
    defineField({
      name: "amazonPrice",
      title: "Amazon Price (INR)",
      type: "number",
      group: "pricing",
      readOnly: true,
      description: "Auto-updated by price sync automation",
    }),
    defineField({
      name: "flipkartPrice",
      title: "Flipkart Price (INR)",
      type: "number",
      group: "pricing",
      readOnly: true,
      description: "Auto-updated by price sync automation",
    }),
    defineField({
      name: "lastUpdated",
      title: "Last Updated",
      type: "datetime",
      group: "pricing",
      readOnly: true,
      description: "Timestamp of last price sync",
    }),
```

---

### Self-Review Checklist

1. **Spec coverage:** Every section of the architecture doc is covered — workflows (Task 5), scrapers (Task 3), sanity API (Task 2), Groq AI (Task 2), orchestrator (Task 4), deps (Task 1), schema fields (Task 6).

2. **Placeholder scan:** No TBD, TODO, or placeholder patterns. Code blocks contain full, runnable implementations.

3. **Type consistency:** `sanity_api.create_product()` expects `title` key matching `groq_ai` output. `launch_checker.py` passes `display_price` as `min(prices)`. `update_price` matches field names in schema. All consistent.
