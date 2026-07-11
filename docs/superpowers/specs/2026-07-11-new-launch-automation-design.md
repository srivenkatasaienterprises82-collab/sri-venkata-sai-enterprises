# New Phone Launch Automation — Design Spec

**Date:** 2026-07-11
**Status:** Approved (design)
**Goal:** Automatically discover newly-launched phones for tracked brands from Flipkart/Amazon, scrape their full details, and create complete draft product documents in Sanity (which the website reads from).

---

## 1. Context

The "New Phone Launch Checker" GitHub Actions workflow runs `automation/launch_checker.py --mode launch` on a schedule (~every 6h) but is currently a **no-op stub**: `check_launches()` sets `scraped_phones = []` and iterates nothing. `create_product()` in `sanity_api.py` only writes a minimal doc (title, brand ref, slug, price, URLs, description, `enabled: false`) — no images, specs, category, colors, or variants.

The price-sync half (`--mode sync`) was recently fixed to extract prices reliably from JSON-LD. This spec extends the same resilient scraping approach to **new-product discovery and full-detail creation**.

### Tracked brand → platform mapping (from `launch_checker.py`)
- **Flipkart:** Motorola, Oppo, Vivo, Realme, Poco, Nothing, Apple, Samsung, OnePlus
- **Amazon:** iQOO, Redmi
- `get_assigned_source()` already returns `flipkart` / `amazon` / `both` / `None`.

---

## 2. Decisions (confirmed with user)

1. **Discovery:** Listing diff per brand — scrape each tracked brand's listing page on its assigned platform, diff against Sanity, add products not already present.
2. **Publish mode:** Draft — new products are created with `enabled: false` and held in Sanity Studio for staff review before going live.
3. **Images:** Remote URLs stored directly in `images[]` (plain URL strings), matching how existing Sanity products work. No uploads, no repo bloat.
4. **Field depth:** Full but tolerant — attempt price, images, description, specifications, colors, variants; never block the add if a fragile field fails to extract.

---

## 3. Architecture & Components

### 3.1 `automation/listing.py` (NEW) — discovery
- `get_brand_listings(brand_name: str, platform: str) -> list[dict]`
  - Fetches the brand's product listing on the assigned platform
    - Flipkart: `https://www.flipkart.com/search?q=<brand>`
    - Amazon: `https://www.amazon.in/s?k=<brand>`
  - Parses product cards → `[{name, url, price, image}]`.
  - Extraction strategy (resilient, in order):
    1. JSON-LD (`ItemList` / `Product` within `CollectionPage`).
    2. Card selectors (Flipkart `div._1xgj1`/title anchors; Amazon `s-result-item` + `a-price`).
    3. Return `[]` if blocked / nothing found (safe — no crash, no false adds).
  - Reuses `HEADERS`, `requests`, `BeautifulSoup` patterns from existing scrapers.

### 3.2 Detail extraction — extend `flipkart.py` / `amazon.py`
- `get_product_details(url: str, platform: str) -> dict`
  - Scrapes the **detail page** → `{price, images: list[str], description, specifications: list[{label,value}], colors: list[{name,hex}], variants: list[...]}`.
  - **price:** reuse the proven JSON-LD `offers.price` extraction (same as price-sync fix).
  - **images:** gallery/CDN image URLs (Flipkart `_396cs4`/`data-src`; Amazon `img` in `#imgTagWrapperId` / JSON-LD `image` array). Stored as plain URL strings.
  - **description:** product description block / JSON-LD `description`.
  - **specifications:** Flipkart specs table / Amazon `tech-specs` (tolerant — skipped if not found).
  - **colors / variants:** variant/color selectors if present (tolerant — skipped if not found).
  - All fields tolerant: missing fragile fields are omitted, not fatal.

### 3.3 `automation/sanity_api.py` (EXTEND)
- `create_full_product(data: dict) -> dict`
  - Builds a **complete** product document:
    - `_type: "product"`
    - `name`, `slug` (generated + de-duplicated)
    - `brand` → reference resolved via `fetch_brand_id(name)`
    - `category` → reference resolved via `fetch_category_id("smartphone")`
    - `type: "smartphone"`, `stock: "inStock"`
    - `price`, `originalPrice` (optional)
    - `amazonUrl` / `flipkartUrl` (from discovery)
    - `images: list[str]` (remote URLs), `image` (first URL)
    - `description`, `specifications: list[{label, value}]`
    - `colors: list[{name, hex}]`, `variants: list[...]`
    - `enabled: false`, `lastUpdated: now()`
  - **Helpers to add:**
    - `fetch_brand_id(brand_name)` — query Sanity for the brand doc `_id` by name.
    - `fetch_category_id(slug_or_name)` — query Sanity for the "smartphone" category `_id`.
    - `generate_slug(name)` — slugify; if collision with an existing slug, append a short suffix to keep unique.
  - Keep existing `create_product()` for backward compatibility (used nowhere critical after this change) or replace its callers.

### 3.4 `automation/launch_checker.py` — rewrite `check_launches()`
- Pseudo-flow:
  1. `existing = fetch_all_products()` → build `existing_names` and `existing_slugs` sets.
  2. For each tracked brand (from `TRACKED_BRANDS`):
     a. `listings = get_brand_listings(brand, platform)`
     b. For each listing item:
        - normalize name (light cleanup; optionally `groq_ai.normalize_and_describe` for description/title if scraping fails).
        - if `is_match(name, any existing)` → skip (already present).
        - else: `details = get_product_details(url, platform)`
        - `create_full_product({...details, name, brand, urls, slug})` (draft).
        - log + count additions.
  3. Print summary (`✓ Added N new phones`).
- **Dry-run flag:** `--dry-run` (or env `DRY_RUN=1`) prints the products that *would* be added without writing to Sanity. Essential for verifying discovery given bot-blocking.
- `--mode launch` already invoked by the workflow; no workflow file change required.

### 3.5 Workflow
- Existing "New Phone Launch Checker" workflow already calls `launch_checker.py --mode launch` on schedule. It will pick up the rewritten function automatically after push. No `.github/workflows` change needed.
- (Optional, not in initial scope) Trigger a Vercel redeploy after adds so Studio drafts are reflected — skipped since drafts are `enabled: false` and not shown.

---

## 4. Data Flow

```
Schedule (GitHub Actions, ~6h)
  → launch_checker.py --mode launch
    → for each tracked brand:
        get_brand_listings(brand, platform)   [listing.py]
        → diff vs Sanity (is_match)
        → for new: get_product_details(url)     [flipkart.py / amazon.py]
        → create_full_product(...)             [sanity_api.py]  (enabled:false)
    → log additions
```

---

## 5. Error Handling

- **Bot-blocking:** every scrape step returns `[]` / `None` / empty on failure (no exceptions propagate). Blocked discovery → no adds (safe), not false adds.
- **Partial detail:** missing specs/colors/variants are omitted; product is still created with core fields (full-but-tolerant).
- **Missing brand/category ref:** if `fetch_brand_id` returns none, fall back to a best-effort brand name string or skip creation with a logged warning (never create an orphaned/invalid doc).
- **Duplicate slug:** `generate_slug` de-duplicates.
- **Dedup:** `is_match` prevents re-adding existing products across runs.

---

## 6. Testing / Verification

1. **Unit-ish local check:** run `python automation/launch_checker.py --mode launch --dry-run` for a single brand; confirm it discovers the right products and the would-be Sanity doc shape is complete (price, images, specs, etc.).
2. **Live compare:** for a known new phone, confirm the scraped price/images match the platform page (same JSON-LD approach validated for price-sync).
3. **Sanity Studio:** after a real run, confirm new draft products appear with full fields and `enabled: false`.
4. **Bot-block reality:** if GitHub Actions IP is blocked, discovery returns empty → run logs "Added 0"; this is acceptable (safe) and can be retried later.

---

## 7. Out of Scope

- Auto-publishing (`enabled: true`) — deferred; products stay drafts for review.
- Uploading images to Sanity assets — using remote URLs instead.
- Manual CSV/seed ingestion — not needed; discovery is automatic.
- Price updates for newly-added products — handled by the separate `--mode sync` run.
