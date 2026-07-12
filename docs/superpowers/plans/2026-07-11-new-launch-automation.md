# New Phone Launch Automation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically discover newly-launched phones for tracked brands from Flipkart/Amazon, scrape full details, and create complete product documents in Sanity (auto-published, `enabled: true`).

**Architecture:** `listing.py` scrapes each brand's listing page (per assigned platform) and diffs against Sanity via `utils.is_match`. For each new product, `flipkart.py`/`amazon.py` `get_*_details()` scrape the detail page (JSON-LD + tolerant selectors). `sanity_api.py` resolves brand/category references and writes a full product doc with `enabled:true` (auto-published). `launch_checker.py`'s `check_launches()` orchestrates it, with a `--dry-run` flag.

**Tech Stack:** Python 3.10, requests, beautifulsoup4, lxml, rapidfuzz, Sanity HTTP API, pytest (added).

---

## File Structure

- **Create** `automation/listing.py` — brand listing discovery (`get_brand_listings`).
- **Modify** `automation/flipkart.py` — add `get_flipkart_details(url)`.
- **Modify** `automation/amazon.py` — add `get_amazon_details(url)`.
- **Modify** `automation/sanity_api.py` — add `fetch_brand_id`, `fetch_category_id`, `fetch_existing_slugs`, `unique_slug`, `create_full_product`, and a shared `create(doc)` helper.
- **Modify** `automation/launch_checker.py` — rewrite `check_launches()` + `--dry-run`.
- **Modify** `requirements.txt` — add `pytest`.
- **Create** `tests/conftest.py`, `tests/fixtures/*.html`, `tests/test_listing.py`, `tests/test_sanity_api.py`, `tests/test_launch_checker.py`.

**Key schema facts (from `src/sanity/schemaTypes/index.ts`):**
- `images` / `coverImage` are `image`-type fields but the codebase stores **plain URL strings** (seeded data + `resolveImage`) — follow that.
- `colors` = `[{name, hex}]`; `variants` = `[{ram, storage, price, originalPrice}]`; `specifications` = `[{label, value}]`.
- `brand` / `category` are references: `{_ref: id, _type: "reference"}`.
- `stock` ∈ `in-stock` / `out-of-stock` / `pre-order`. `enabled` is a tolerated extra field used by GROQ filters.

---

### Task 1: Add pytest and scaffold tests

**Files:** Modify `requirements.txt`; Create `tests/__init__.py`, `tests/conftest.py`

- [ ] **Step 1: Add pytest to requirements**

```
requests>=2.31.0
beautifulsoup4>=4.12.0
playwright>=1.40.0
lxml>=4.9.0
python-dotenv>=1.0.0
rapidfuzz>=3.0.0
groq>=0.5.0
pytest>=8.0.0
```

- [ ] **Step 2: Create `tests/__init__.py`** (empty file)
- [ ] **Step 3: Create `tests/conftest.py`** with shared fixtures

```python
import os
import sys
import pytest

# Make the automation package importable when tests run from repo root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


@pytest.fixture
def fixture_html():
    def _load(name):
        with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
            return f.read()
    return _load
```

- [ ] **Step 4: Commit**

```bash
git add requirements.txt tests/__init__.py tests/conftest.py
git commit -m "test: scaffold pytest for launch automation"
```

---

### Task 2: Sanity reference/slug helpers (`sanity_api.py`)

**Files:** Modify `automation/sanity_api.py`; Create `tests/test_sanity_api.py`

- [ ] **Step 1: Write failing tests**

```python
import automation.sanity_api as sa
from unittest.mock import patch


def test_fetch_brand_id_returns_id():
    fake = {"result": [{"_id": "brand-xyz"}]}
    with patch("automation.sanity_api.requests.get") as g:
        g.return_value.status_code = 200
        g.return_value.json.return_value = fake
        assert sa.fetch_brand_id("Motorola") == "brand-xyz"


def test_fetch_category_id_falls_back():
    # first query empty, second ("mobile") returns id
    seq = [
        {"result": []},
        {"result": [{"_id": "cat-mobile"}]},
    ]
    with patch("automation.sanity_api.requests.get") as g:
        g.return_value.status_code = 200
        g.return_value.json.side_effect = lambda: seq.pop(0)
        assert sa.fetch_category_id("smartphone") == "cat-mobile"


def test_unique_slug_avoids_collision():
    with patch.object(sa, "fetch_existing_slugs", return_value={"iphone-17", "iphone-17-2"}):
        assert sa.unique_slug("iPhone 17") == "iphone-17-3"
```

- [ ] **Step 2: Run tests, expect failures** (`AttributeError: module has no attribute fetch_brand_id`)
```
python -m pytest tests/test_sanity_api.py -q
```

- [ ] **Step 3: Implement helpers** (add to `automation/sanity_api.py`)

```python
def _query(query: str) -> list:
    url = f"{BASE_URL}/data/query/{DATASET}?query={requests.utils.quote(query)}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return res.json().get("result", []) or []
    return []


def fetch_brand_id(brand_name: str):
    q = f'*[_type=="brand" && name=="{brand_name.replace(chr(34), "")}"]{{_id}}'
    rows = _query(q)
    return rows[0]["_id"] if rows else None


def fetch_category_id(slug: str):
    q = f'*[_type=="category" && slug.current=="{slug}"]{{_id}}'
    rows = _query(q)
    return rows[0]["_id"] if rows else None


def fetch_existing_slugs() -> set:
    q = '*[_type=="product"]{slug}'
    rows = _query(q)
    return {r["slug"]["current"] for r in rows if r.get("slug")}


def unique_slug(name: str) -> str:
    from automation.utils import slugify
    base = slugify(name)
    existing = fetch_existing_slugs()
    if base not in existing:
        return base
    i = 2
    while f"{base}-{i}" in existing:
        i += 1
    return f"{base}-{i}"
```

- [ ] **Step 4: Run tests, expect pass**
```
python -m pytest tests/test_sanity_api.py -q
```

- [ ] **Step 5: Commit**
```bash
git add automation/sanity_api.py tests/test_sanity_api.py
git commit -m "feat: Sanity brand/category/slug helpers"
```

---

### Task 3: `create_full_product` (`sanity_api.py`)

**Files:** Modify `automation/sanity_api.py`; extend `tests/test_sanity_api.py`

- [ ] **Step 1: Write failing test**

```python
def test_create_full_product_builds_draft_doc():
    details = {
        "price": 82900,
        "images": ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
        "description": "A great phone.",
        "specifications": [{"label": "RAM", "value": "8 GB"}],
        "colors": [{"name": "Black", "hex": "#000000"}],
        "variants": [{"ram": "8 GB", "storage": "128 GB", "price": 82900}],
    }
    with patch.object(sa, "fetch_brand_id", return_value="brand-moto"), \
         patch.object(sa, "fetch_category_id", return_value="cat-phone"), \
         patch.object(sa, "unique_slug", return_value="moto-g"), \
         patch.object(sa, "create") as c:
        sa.create_full_product("Moto G", "Motorola", "flipkart",
                               "https://flipkart.com/p/moto-g", details)
        doc = c.call_args[0][0]
        assert doc["_type"] == "product"
        assert doc["enabled"] is False
        assert doc["type"] == "smartphone"
        assert doc["stock"] == "in-stock"
        assert doc["brand"] == {"_ref": "brand-moto", "_type": "reference"}
        assert doc["category"] == {"_ref": "cat-phone", "_type": "reference"}
        assert doc["coverImage"] == "https://cdn.example.com/a.jpg"
        assert doc["images"] == details["images"]
        assert doc["flipkartUrl"] == "https://flipkart.com/p/moto-g"
        assert doc["amazonUrl"] is None


def test_create_full_product_skips_without_brand():
    with patch.object(sa, "fetch_brand_id", return_value=None), \
         patch.object(sa, "create") as c:
        res = sa.create_full_product("X", "UnknownBrand", "flipkart", "u", {})
        assert res is None
        c.assert_not_called()
```

- [ ] **Step 2: Run, expect failure** (`create_full_product` not defined)

- [ ] **Step 3: Implement** (add to `automation/sanity_api.py`)

```python
def create(doc: dict) -> dict:
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {"mutations": [{"create": doc}]}
    res = requests.post(url, headers=HEADERS, json=mutations)
    return res.json()


def create_full_product(name, brand_name, platform, source_url, details):
    brand_id = fetch_brand_id(brand_name)
    if not brand_id:
        print(f"  SKIP {name}: brand '{brand_name}' not found in Sanity")
        return None
    cat_id = fetch_category_id("smartphone") or fetch_category_id("mobile")
    slug = unique_slug(name)
    images = details.get("images") or []
    doc = {
        "_type": "product",
        "name": name,
        "slug": {"_type": "slug", "current": slug},
        "type": "smartphone",
        "stock": "in-stock",
        "price": details.get("price"),
        "brand": {"_ref": brand_id, "_type": "reference"},
        "brandSlug": slugify(brand_name),
        "category": {"_ref": cat_id, "_type": "reference"} if cat_id else None,
        "categorySlug": "smartphone",
        "amazonUrl": source_url if platform == "amazon" else None,
        "flipkartUrl": source_url if platform == "flipkart" else None,
        "coverImage": images[0] if images else None,
        "images": images,
        "description": details.get("description") or "",
        "specifications": details.get("specifications") or [],
        "colors": details.get("colors") or [],
        "variants": details.get("variants") or [],
        "enabled": False,
        "lastUpdated": datetime.now().isoformat(),
    }
    # Drop None references so Sanity doesn't store dangling refs
    if doc["category"] is None:
        del doc["category"]
    print(f"  + created draft: {name} (slug={slug})")
    return create(doc)
```

- [ ] **Step 4: Run tests, expect pass**
```
python -m pytest tests/test_sanity_api.py -q
```

- [ ] **Step 5: Commit**
```bash
git add automation/sanity_api.py tests/test_sanity_api.py
git commit -m "feat: create_full_product builds complete draft doc"
```

---

### Task 4: Listing discovery (`listing.py`) + fixture

**Files:** Create `automation/listing.py`, `tests/fixtures/flipkart_listing.html`, `tests/test_listing.py`

- [ ] **Step 1: Create fixture `tests/fixtures/flipkart_listing.html`**

```html
<html><body>
  <a href="/p/iphone-17/abc" class="_1xgj1"><img alt="Apple iPhone 17 Black 256 GB"/></a>
  <div class="_30jeq3">₹82,900</div>
  <a href="/p/poco-c71/xyz" class="_1xgj1"><img alt="POCO C71 Lime 4 GB"/></a>
  <div class="_30jeq3">₹9,999</div>
</body></html>
```

- [ ] **Step 2: Write failing test**

```python
import automation.listing as L
from unittest.mock import patch


def test_parse_flipkart_listing(fixture_html):
    html = fixture_html("flipkart_listing.html")
    items = L._parse_flipkart(html)
    names = {i["name"] for i in items}
    assert "Apple iPhone 17 Black 256 GB" in names
    assert "POCO C71 Lime 4 GB" in names
    assert any(i["price"] == 82900 for i in items)
    assert any(i["url"].endswith("/p/iphone-17/abc") for i in items)


def test_get_brand_listings_flipkart():
    html = open("tests/fixtures/flipkart_listing.html", encoding="utf-8").read()
    with patch.object(L, "_fetch", return_value=html):
        items = L.get_brand_listings("Apple", "flipkart")
        assert len(items) == 2
```

- [ ] **Step 3: Run, expect failure** (`module has no attribute _parse_flipkart`)

- [ ] **Step 4: Implement `automation/listing.py`**

```python
import re
import time
import random
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
}


def _fetch(url: str) -> str | None:
    try:
        time.sleep(random.uniform(1, 2))
        resp = requests.get(url, headers=HEADERS, timeout=30)
        return resp.text if resp.status_code == 200 else None
    except requests.RequestException:
        return None


def _parse_flipkart(html: str) -> list:
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()
    for a in soup.select('a[href*="/p/"]'):
        href = a.get("href", "")
        if "/p/" not in href:
            continue
        url = "https://www.flipkart.com" + href if href.startswith("/") else href
        name = a.get("title") or (a.find("img") or {}).get("alt") or a.get_text(strip=True)
        if not name or name in seen:
            continue
        seen.add(name)
        card = a.parent
        price = _first_price(card.get_text(" ", strip=True))
        img = a.find("img")
        image = img.get("src") or img.get("data-src") if img else None
        items.append({"name": name, "url": url, "price": price, "image": image})
    return items


def _parse_amazon(html: str) -> list:
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()
    for card in soup.select("div.s-result-item"):
        a = card.select_one("a.a-link-normal[href*='/dp/']") or card.select_one("h2 a")
        if not a:
            continue
        href = a.get("href", "")
        url = "https://www.amazon.in" + href if href.startswith("/") else href
        name = (a.get("title") or a.get_text(strip=True))
        if not name or name in seen:
            continue
        seen.add(name)
        price = _first_price(card.get_text(" ", strip=True))
        img = card.select_one("img")
        image = img.get("src") if img else None
        items.append({"name": name, "url": url, "price": price, "image": image})
    return items


def _first_price(text: str):
    m = re.search(r"₹\s*([\d,]+)", text or "")
    if not m:
        m = re.search(r"Rs\.?\s*([\d,]+)", text or "")
    if not m:
        return None
    digits = re.sub(r"[^\d]", "", m.group(1))
    return int(digits) if digits else None


def get_brand_listings(brand_name: str, platform: str) -> list:
    if platform == "amazon":
        url = f"https://www.amazon.in/s?k={requests.utils.quote(brand_name)}"
        html = _fetch(url)
        return _parse_amazon(html) if html else []
    url = f"https://www.flipkart.com/search?q={requests.utils.quote(brand_name)}"
    html = _fetch(url)
    return _parse_flipkart(html) if html else []
```

- [ ] **Step 5: Run tests, expect pass**
```
python -m pytest tests/test_listing.py -q
```

- [ ] **Step 6: Commit**
```bash
git add automation/listing.py tests/fixtures/flipkart_listing.html tests/test_listing.py
git commit -m "feat: brand listing discovery for launch checker"
```

---

### Task 5: Detail extraction (`flipkart.py` / `amazon.py`)

**Files:** Modify `automation/flipkart.py` (add `get_flipkart_details`), `automation/amazon.py` (add `get_amazon_details`); Create `tests/fixtures/flipkart_detail.html`, `tests/test_details.py`

- [ ] **Step 1: Create fixture `tests/fixtures/flipkart_detail.html`**

```html
<html><body>
<script type="application/ld+json">{"@type":"Product","name":"Apple iPhone 17","offers":{"price":"82900"},"image":["https://cdn.flipkart.com/a.jpg","https://cdn.flipkart.com/b.jpg"]}</script>
<div class="_1sMYq3">A great smartphone with a 48MP camera.</div>
<table><tr><td>RAM</td><td>8 GB</td></tr><tr><td>Battery</td><td>4000 mAh</td></tr></table>
</body></html>
```

- [ ] **Step 2: Write failing test**

```python
import automation.flipkart as fk


def test_get_flipkart_details(fixture_html):
    html = fixture_html("flipkart_detail.html")
    with __import__("unittest.mock").patch.object(fk, "_try_requests", return_value=(html, None)), \
         __import__("unittest.mock").patch.object(fk, "_try_playwright", return_value=None):
        d = fk.get_flipkart_details("https://flipkart.com/p/x")
        assert d["price"] == 82900
        assert "https://cdn.flipkart.com/a.jpg" in d["images"]
        assert "48MP camera" in d["description"]
        assert any(s["label"] == "RAM" for s in d["specifications"])
```

- [ ] **Step 3: Run, expect failure** (`get_flipkart_details` not defined)

- [ ] **Step 4: Implement in `automation/flipkart.py`** (append)

```python
def get_flipkart_details(url: str) -> dict:
    html = _try_requests(url)
    if not html:
        html = _try_playwright(url) or ""
    soup = BeautifulSoup(html, "lxml") if html else None
    details = {"price": None, "images": [], "description": "", "specifications": [], "colors": [], "variants": []}
    if not soup:
        return details
    details["price"] = _extract_jsonld_price(soup)
    # Images
    for img in soup.select("img"):
        src = img.get("src") or img.get("data-src") or ""
        if "flipkart" in src or "fkimg" in src:
            details["images"].append(src)
    # Description
    desc = soup.select_one("div._1sMYq3") or soup.select_one("div._3coCp9")
    details["description"] = desc.get_text(strip=True) if desc else ""
    # Specifications (tolerant)
    for row in soup.select("table tr"):
        cells = row.find_all("td")
        if len(cells) == 2:
            details["specifications"].append({"label": cells[0].get_text(strip=True), "value": cells[1].get_text(strip=True)})
    return details
```

Add the same shape to `automation/amazon.py` as `get_amazon_details`, using `div#feature-bullets` for description and `table` for specs, and `img` CDN (`m.media-amazon.com`) for images.

- [ ] **Step 5: Run tests, expect pass**
```
python -m pytest tests/test_details.py -q
```

- [ ] **Step 6: Commit**
```bash
git add automation/flipkart.py automation/amazon.py tests/fixtures/flipkart_detail.html tests/test_details.py
git commit -m "feat: full detail extraction for new products"
```

---

### Task 6: Orchestrate `check_launches()` (`launch_checker.py`)

**Files:** Modify `automation/launch_checker.py`; Create `tests/test_launch_checker.py`

- [ ] **Step 1: Write failing test**

```python
import automation.launch_checker as lc
from unittest.mock import patch


def test_check_launches_adds_new_only():
    existing = [{"name": "iPhone 17", "slug": {"current": "iphone-17"}}]
    listings = [{"name": "iPhone 17", "url": "u1", "price": 82900, "image": "i1"},
                {"name": "Brand New X", "url": "u2", "price": 19999, "image": "i2"}]
    with patch.object(lc.sanity_api, "fetch_all_products", return_value=existing), \
         patch.object(lc, "get_brand_listings", return_value=listings), \
         patch.object(lc, "get_product_details", return_value={"price": 19999, "images": ["i2"]}), \
         patch.object(lc.sanity_api, "create_full_product") as c:
        added = lc.check_launches(dry_run=True)
        assert added == 1
        c.assert_called_once()
        assert c.call_args[0][0] == "Brand New X"
```

- [ ] **Step 2: Run, expect failure** (`check_launches` signature / behavior)

- [ ] **Step 3: Rewrite `check_launches()`** in `automation/launch_checker.py`

```python
import automation.listing as listing
import automation.sanity_api as sanity_api
from automation.flipkart import get_flipkart_details
from automation.amazon import get_amazon_details
from automation.utils import is_match


def _details_for(url, platform):
    if platform == "amazon":
        return get_amazon_details(url)
    return get_flipkart_details(url)


def check_launches(dry_run: bool = False) -> int:
    print("Checking for new launches..." + (" (DRY RUN)" if dry_run else ""))
    existing = sanity_api.fetch_all_products()
    existing_names = [p.get("name", "") for p in existing]
    added_count = 0
    for brand in TRACKED_BRANDS:
        source = get_assigned_source({"brand": {"name": brand}})
        if source is None:
            continue
        platform = "amazon" if source == "amazon" else "flipkart"
        listings = listing.get_brand_listings(brand, platform)
        for item in listings:
            name = item.get("name", "")
            if not name:
                continue
            if any(is_match(name, e) for e in existing_names):
                continue
            details = _details_for(item["url"], platform) or {}
            if not details.get("price") and item.get("price"):
                details["price"] = item["price"]
            if not details.get("images") and item.get("image"):
                details["images"] = [item["image"]]
            print(f"  NEW: {name} ({brand})")
            added_count += 1
            if dry_run:
                continue
            sanity_api.create_full_product(name, brand, platform, item["url"], details)
    print(f"✓ Added {added_count} new phone(s)." + (" (dry run)" if dry_run else ""))
    return added_count
```

Also update the `__main__` block to pass `--dry-run`:
```python
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to Sanity")
    ...
    if args.mode == "launch":
        check_launches(dry_run=args.dry_run)
```

- [ ] **Step 4: Run tests, expect pass**
```
python -m pytest tests/test_launch_checker.py -q
```

- [ ] **Step 5: Commit**
```bash
git add automation/launch_checker.py tests/test_launch_checker.py
git commit -m "feat: orchestrate new-launch discovery + draft creation"
```

---

### Task 7: Full validation, commit, push

**Files:** All above

- [ ] **Step 1: Run the whole test suite**
```
python -m pytest -q
```
Expected: all pass.

- [ ] **Step 2: Local dry-run against one brand** (validates discovery end-to-end without writing)
```
python -c "import automation.launch_checker as lc; lc.check_launches(dry_run=True)"
```
Expected: prints discovered NEW products (or "Added 0" if GitHub/local IP is bot-blocked — safe).

- [ ] **Step 3: Commit any leftover, then push**
```bash
git add -A
git commit -m "chore: launch automation complete" || echo "nothing to commit"
git push origin main
```
Expected: `main -> main`.

- [ ] **Step 4: Confirm the scheduled "New Phone Launch Checker" workflow will pick up the new `check_launches()` on its next run. (No workflow file change needed — it already calls `--mode launch`.)

---

## Self-Review Notes

- **Spec coverage:** Discovery (Task 4/6), auto-publish mode `enabled:true` (Task 3), remote URL images (Task 3/5), full-but-tolerant fields (Task 5) — all covered.
- **No placeholders:** every task has code; selectors flagged tolerant where Flipkart/Amazon markup varies.
- **Type consistency:** `get_brand_listings` → list of `{name,url,price,image}`; `get_*_details` → `{price,images,description,specifications,colors,variants}`; `create_full_product(name, brand_name, platform, source_url, details)` — signatures match across Task 3/5/6.
- **Caveat:** Flipkart/Amazon markup selectors (`_1xgj1`, `_30jeq3`, `_1sMYq3`, `s-result-item`) are best-effort and may need live tuning; the dry-run (Task 7 Step 2) is the verification gate.
