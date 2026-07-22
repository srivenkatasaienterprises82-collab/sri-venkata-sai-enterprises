import re
import time
import random
import requests
from bs4 import BeautifulSoup

from http_helper import (
is_interstitial,
random_user_agent,
new_session,
get_with_retry,
)
from fetch_manager import FetchManager
from parser import dom_fingerprint, vote, confident_price
from flipkart_variants import extract as fk_extract

# playwright-stealth hides the automation tells Playwright leaves in the DOM.
# Guarded so tests/locales without the package still run (just less stealthy).
try:
    from playwright_stealth import stealth_sync
    STEALTH_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    stealth_sync = None
    STEALTH_AVAILABLE = False

# How many times to retry the requests/Playwright pass. Each pass already
# has its own internal delay+jitter between attempts.
REQUEST_RETRIES = 3
PLAYWRIGHT_RETRIES = 2

# Domain used when exporting the warmed Playwright cookies back into the HTTP
# session. Flipkart sets clearance cookies on this host.
FK_DOMAIN = "flipkart.com"
FK_BASE = "https://www.flipkart.com/"

# One FetchManager per process (keeps the cookie cache / proxy config shared).
_fm = FetchManager(FK_DOMAIN, FK_BASE,
                   http_retries=REQUEST_RETRIES, browser_retries=PLAYWRIGHT_RETRIES)


def get_flipkart_price(url: str) -> int | None:
    """Fetch via the central FetchManager, then run the deterministic
    multi-strategy parser with a confidence gate (items 1-3, 10-12)."""
    if not url:
        return None

    outcome = _fm.fetch(url)
    if not outcome.ok:
        print(f"    Flipkart fetch failed: {outcome.failure} ({outcome.legs})")
        return None

    soup = BeautifulSoup(outcome.html, "lxml")
    fp = dom_fingerprint(outcome.html)
    is_product = _is_flipkart_product_page(soup)
    if not is_product:
        # Not a real product page (interstitial/empty) → refuse to parse a
        # stray price, even if one is present.
        print(f"    Flipkart: not a genuine product page (fp={fp}); skipping")
        return None

    candidates = [
        ("jsonld", _extract_jsonld_price(soup)),
        ("card_css", _extract_card_price(soup)),
    ]
    result = vote(candidates, is_product_page=is_product, fingerprint=fp)
    print(f"    Flipkart parse: {result.reason}")
    price = confident_price(result)
    if price is None:
        print(f"    Flipkart: confidence {result.confidence:.2f} < gate; dropping")
    return price



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
            # Rotate UA + spoof the automation signals Chrome exposes so the
            # headless browser reads as a normal desktop visitor. Combined with
            # the interstitial check below, this is what lets Playwright rescue
            # requests that Flipkart's bot-wall blocked.
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
            if STEALTH_AVAILABLE:
                stealth_sync(page)
            page.set_default_timeout(60000)

            try:
                page.goto(url, wait_until="commit", timeout=20000)
                time.sleep(random.uniform(2, 3))
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except PwTimeout:
                    pass

                # Bail early if Flipkart served a bot-check page instead of the
                # product. Without this we'd parse a CAPTCHA interstitial's
                # stray price widget.
                if is_interstitial(page.content()):
                    print(f"  Flipkart Playwright: bot-check interstitial (attempt {attempt})")
                    return None

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
        session = new_session()
        result = get_with_retry(session, url, timeout=30, max_tries=2)
        if not result.ok:
            return None

        soup = BeautifulSoup(result.html, "lxml")

        # Reject bot-check / CAPTCHA interstitials that return HTTP 200
        # but aren't real product pages. Without this guard the parser
        # returns a truthy dict with empty fields and the retry loop
        # bails out early — defeating the whole purpose of retries.
        if not _is_flipkart_product_page(soup):
            print(f"  Flipkart details: not a product page (attempt {attempt})")
            return None

        details = _parse_flipkart_details(result.html)
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
            if STEALTH_AVAILABLE:
                stealth_sync(page)
            page.set_default_timeout(60000)

            try:
                page.goto(url, wait_until="commit", timeout=20000)
                time.sleep(random.uniform(2, 3))
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except PwTimeout:
                    pass

                if is_interstitial(page.content()):
                    print(f"  Flipkart details Playwright: bot-check interstitial (attempt {attempt})")
                    return None

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
    # Delegate variant extraction to flipkart_variants (Playwright-first strategies).
    variants = fk_extract._run_extractors(html).variants if False else _extract_flipkart_variants(soup)
    return {
        "price": price,
        "images": _extract_flipkart_images(soup),
        "description": _extract_flipkart_description(soup),
        "specifications": _extract_flipkart_specs(soup),
        "colors": _extract_flipkart_colors(soup),
        "variants": variants,
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
    """Extract RAM/Storage variant combos from the page HTML.

    Three strategies, merged with the most authoritative price source winning:

      Tier 1  — `window.__NEXT_DATA__` / `_pageContext` inline JSON. This is
                the structured variant/price tree Flipkart *renders* from and is
                by far the most reliable source of per-variant prices (JSON-LD
                rarely carries them).
      Tier 2  — JSON-LD offers whose name/desc contains a "X GB / Y GB" pattern.
      Tier 3  — text-pattern scan for "X GB / Y GB" anywhere on the page
                (yields variants with price=None as a last resort).

    Returns a deduplicated list of {"ram", "storage", "price"} dicts. A variant
    with price=None means "we know this combo exists but couldn't read its
    price" — the orchestrator then falls back to the blend logic.
    """
    # ── Tier 1: inline Next.js / pageContext JSON ──────────────────────
    next_variants = _extract_variants_from_next_data(soup)

    # ── Tier 2: JSON-LD offers ─────────────────────────────────────────
    ld_variants = _extract_variants_from_jsonld(soup)

    # ── Tier 3: text-pattern scan ─────────────────────────────────────
    text_variants = {}
    for el in soup.find_all(string=re.compile(r"\d+\s*GB\s*/\s*\d+\s*GB", re.I)):
        m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", el, re.I)
        if m:
            key = (f"{m.group(1)} GB", f"{m.group(2)} GB")
            if key not in text_variants:
                # Emit BOTH `price` (legacy, used by `update_price_and_variants`
                # blend logic) AND `flipkartPrice` (per-variant marketplace
                # price for the new variant-level schema). When the orchestrator
                # scrapes both Flipkart and Amazon, the launch_checker merges
                # variants by (ram, storage) so a single variant can carry
                # both marketplace prices side-by-side.
                text_variants[key] = {"ram": key[0], "storage": key[1], "price": None, "flipkartPrice": None}

    # Merge: Tier 1 wins on flipkartPrice, then Tier 2, then Tier 3 supplies combos
    # that nothing else found.
    merged = {}
    for v in list(text_variants.values()) + ld_variants + next_variants:
        key = (v["ram"], v["storage"])
        if key not in merged or _has_no_price(merged[key]):
            merged[key] = v
    return list(merged.values())


def _has_no_price(v: dict) -> bool:
    """True if a variant carries no per-variant price from any marketplace."""
    return (
        v.get("price") is None
        and v.get("flipkartPrice") is None
        and v.get("amazonPrice") is None
    )


def _extract_variants_from_next_data(soup: BeautifulSoup) -> list:
    """Parse Flipkart's inline `window.__NEXT_DATA__` / `_pageContext` JSON.

    Flipkart renders the PDP from a big inline JSON blob (script id
    `__NEXT_DATA__` in newer builds, or `window.__INITIAL_STATE__` /
    `window._pageContext` in others). The variant price tree usually lives under
    a key like `variants` / `colorVariant` / `productView` / `price`. We walk
    the whole blob for objects that carry both a RAM/Storage label and a price,
    which is robust to FK reshuffling the exact nesting.

    Returns a list of {"ram", "storage", "price"} dicts (may be empty).
    """
    import json as _json

    candidates = []
    for script in soup.find_all("script"):
        raw = script.string or script.get_text() or ""
        if not raw.strip():
            continue
        # Grab the JSON object assigned to the known inline-state globals.
        for marker in ("__NEXT_DATA__", "__INITIAL_STATE__", "_pageContext"):
            idx = raw.find(marker)
            if idx == -1:
                continue
            # Find the first '{' after the assignment and parse greedily.
            brace = raw.find("{", idx)
            if brace == -1:
                continue
            # Try progressively shorter suffixes until json.loads accepts it.
            depth = 0
            end = None
            for i in range(brace, len(raw)):
                if raw[i] == "{":
                    depth += 1
                elif raw[i] == "}":
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            if end is None:
                continue
            chunk = raw[brace:end]
            try:
                data = _json.loads(chunk)
            except _json.JSONDecodeError:
                # Handle the case where the assignment is `= {...};` and there's
                # trailing JS after the object (retry trimming at last '}').
                last = chunk.rfind("}")
                if last != -1:
                    try:
                        data = _json.loads(chunk[: last + 1])
                    except _json.JSONDecodeError:
                        continue
                else:
                    continue
            candidates.append(data)

    variants = []
    for data in candidates:
        variants.extend(_walk_for_variants(data))
    # Dedupe by (ram, storage), keeping first variant that has any price.
    seen = {}
    out = []
    for v in variants:
        key = (v["ram"], v["storage"])
        if key not in seen or _has_no_price(seen[key]):
            seen[key] = v
    return list(seen.values())


def _find_price(node):
    """Find the price that BELONGS to a single variant object.

    Critical fix: this must NOT recursively scan the whole subtree. Flipkart's
    inline JSON nests the *product-level* price somewhere deep inside each
    variant object, so a recursive search always returns that one shared price
    for every variant — collapsing all per-variant prices to a single value
    (e.g. vivo-v70 got ₹53,999 on every variant). Instead we only inspect the
    variant object's OWN direct scalar fields, preferring keys whose name looks
    price-like (price/value/mrp/sellingPrice/offerPrice), then any other scalar
    that looks like a price. We deliberately skip lists/dicts so a nested
    product blob can't leak its price in.
    """
    if isinstance(node, dict):
        # Preferred: explicit price-like sibling keys (checked first). A price
        # may be nested one level deep as {value: 53999} (Flipkart's common
        # shape) — we peek exactly one level into those keys and no deeper, so
        # a distant product-level price blob can't leak in.
        for key in ("price", "value", "mrp", "mrpPrice", "sellingPrice",
                    "offerPrice", "finalPrice", "discountedPrice", "cost"):
            if key in node:
                p = _scalar_price(node[key])
                if p is not None:
                    return p
                if isinstance(node[key], dict):
                    for v in node[key].values():
                        p = _scalar_price(v)
                        if p is not None:
                            return p
        # Fallback: any direct scalar field that looks like a price.
        for v in node.values():
            p = _scalar_price(v)
            if p is not None:
                return p
    # A bare scalar (int/float/str) passed directly.
    return _scalar_price(node)


def _scalar_price(value):
    """Price-like check for a single scalar value (no recursion)."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        if 1000 <= float(value) <= 300000:
            return int(value)
        return None
    if isinstance(value, str):
        s = value.strip()
        if "gb" in s.lower():
            return None
        digits = re.sub(r"[^\d]", "", s)
        if digits and 1000 <= int(digits) <= 300000:
            return int(digits)
        return None
    return None


def _walk_for_variants(node, _path=""):
    """Recursively search a parsed JSON blob for variant-shaped objects.

    A variant-shaped object is one that has BOTH a RAM/Storage "X GB / Y GB"
    string (in any of its fields) AND a numeric price (possibly nested under a
    `price`/`value` key — Flipkart nests it). We deliberately avoid requiring
    exact key names (RamCapacity / storage / price) because Flipkart renames
    them across builds.
    """
    found = []
    if isinstance(node, dict):
        blob = " ".join(str(v) for v in node.values())
        m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", blob, re.I)
        price = None
        if m:
            price = _find_price(node)
        if m and price is not None:
            found.append({
                "ram": f"{m.group(1)} GB",
                "storage": f"{m.group(2)} GB",
                # Legacy `price` alias (used by update_price_and_variants when
                # picking the cheapest variant as the product's display_price),
                # plus the per-marketplace `flipkartPrice` for variant-level
                # price storage on the product.
                "price": price,
                "flipkartPrice": price,
            })
        for val in node.values():
            found.extend(_walk_for_variants(val, _path + "."))
    elif isinstance(node, list):
        for item in node:
            found.extend(_walk_for_variants(item, _path + "[]"))
    return found


def _extract_variants_from_jsonld(soup: BeautifulSoup) -> list:
    """Parse JSON-LD structured data for multi-offer variant prices.

    Flipkart and Amazon both embed JSON-LD with an ``offers`` array when
    the product has multiple variants (RAM/Storage/Color). Each offer may
    include a ``name`` like "8 GB / 128 GB" and a ``price``.

    Returns a list of {"ram", "storage", "price"} dicts (may be empty).
    """
    import json

    variants = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
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
                        "flipkartPrice": price,
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
                            "flipkartPrice": price,
                        })

    # Deduplicate (JSON-LD may list the same variant multiple times)
    seen = {}
    out = []
    for v in variants:
        key = (v["ram"], v["storage"])
        if key not in seen or _has_no_price(seen[key]):
            seen[key] = v
    return list(seen.values())
