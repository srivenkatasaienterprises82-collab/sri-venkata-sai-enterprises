"""
Playwright-first Flipkart variant extraction.

Strategies (priority order):
  1. React props (__REACT_PROPS__) — NEW (Change 4)
  2. __NEXT_DATA__ — existing
  3. JSON-LD structured data — existing
  4. window.__INITIAL_STATE__ — NEW (Change 4)
  5. Text-pattern scan — last resort

Playwright is tried FIRST (Change 3), curl_cffi second.
"""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field


@dataclass
class ScrapeResult:
    price: int | None = None
    variants: list[dict] = field(default_factory=list)
    fingerprint: str = ""
    extractors_used: list[str] = field(default_factory=list)
    elapsed_ms: float = 0.0
    source: str = ""


_EXTRACTOR_NAMES = [
    "react_props",
    "next_data",
    "jsonld",
    "initial_state",
    "text_pattern",
]


def extract(url: str) -> ScrapeResult:
    t0 = time.time()
    fp = ""
    try:
        html, fp, source = _playwright_html(url)
        if html:
            r = _run_extractors(html)
            if r.variants:
                r.fingerprint = fp
                r.source = source
                r.elapsed_ms = (time.time() - t0) * 1000
                return r
    except Exception:
        pass
    try:
        html, fp, source = _curl_html(url)
        if html:
            r = _run_extractors(html)
            if r.variants:
                r.fingerprint = fp
                r.source = source
                r.elapsed_ms = (time.time() - t0) * 1000
                return r
    except Exception:
        pass
    return ScrapeResult(fingerprint=fp, source="none", elapsed_ms=(time.time() - t0) * 1000)


# -----------------------------------------------------------------------
# Fetch
# -----------------------------------------------------------------------

def _playwright_html(url: str) -> tuple[str, str, str]:
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
        try:
            from playwright_stealth import stealth_sync
        except ImportError:
            stealth_sync = None
        from automation.http_helper import random_user_agent, is_interstitial
    except ImportError:
        return "", "", "playwright_unavailable"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            context = browser.new_context(
                user_agent=random_user_agent(),
                locale="en-IN",
                viewport={"width": 1366, "height": 768},
                device_scale_factor=1,
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )
            context.add_init_script(
                "Object.defineProperty(navigator, 'languages', {get: () => ['en-IN','en']});"
            )
            page = context.new_page()
            if stealth_sync:
                stealth_sync(page)
            page.set_default_timeout(60000)
            try:
                page.goto(url, wait_until="commit", timeout=20000)
                time.sleep(2)
                try:
                    page.wait_for_load_state("networkidle", timeout=20000)
                except PwTimeout:
                    pass
            except Exception:
                pass
            html = page.content()
            if not html or len(html) < 200 or is_interstitial(html):
                return "", "", "playwright_bot"
            fp = _dom_fingerprint(html)
            return html, fp, "playwright"
        finally:
            browser.close()


def _curl_html(url: str) -> tuple[str, str, str]:
    from automation.http_helper import new_session, get_with_retry, is_interstitial
    session = new_session()
    result = get_with_retry(session, url, timeout=30, max_tries=2)
    if result.ok and result.html and not is_interstitial(result.html):
        fp = _dom_fingerprint(result.html)
        return result.html, fp, "curl"
    if result.stage == "http_bot":
        return "", "", "curl_bot"
    return "", "", "curl_failed"


# -----------------------------------------------------------------------
# DOM fingerprint
# -----------------------------------------------------------------------

def _dom_fingerprint(html: str) -> str:
    import hashlib
    if not html:
        return "empty"
    sig = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.S | re.I)
    tags = re.findall(r"<([a-zA-Z0-9]+)", sig)
    path = " ".join(tags[:4000])
    return hashlib.sha1(path.encode()).hexdigest()[:16]


# -----------------------------------------------------------------------
# Strategy dispatch
# -----------------------------------------------------------------------

def _run_extractors(html: str) -> ScrapeResult:
    best = ScrapeResult()
    for name in _EXTRACTOR_NAMES:
        fn = _STRATEGIES.get(name)
        if not fn:
            continue
        try:
            variants = fn(html)
            good = [v for v in variants if _variant_has_price(v)]
            if not good:
                continue
            priced = [v["price"] for v in good if isinstance(v.get("price"), (int, float))]
            if priced:
                best.price = min(priced)
            best.variants = good
            best.extractors_used.append(name)
            break
        except Exception:
            continue
    return best


def _variant_has_price(v: dict) -> bool:
    return isinstance(v.get("price"), (int, float)) and v["price"] > 0


# -----------------------------------------------------------------------
# Strategy 1: __REACT_PROPS__
# -----------------------------------------------------------------------

def _extract_from_react_props(html: str) -> list[dict]:
    candidates = []
    for m in re.finditer(r"__REACT_PROPS__\b", html, re.I):
        start = html.find("{", m.end())
        if start == -1:
            continue
        depth = 0
        end = None
        for i in range(start, len(html)):
            if html[i] == "{":
                depth += 1
            elif html[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end is None:
            continue
        chunk = html[start:end]
        try:
            data = json.loads(chunk)
        except json.JSONDecodeError:
            continue
        candidates.extend(_walk_data_for_variants(data))
    seen: dict[tuple, dict] = {}
    for v in candidates:
        key = (_ns(v.get("ram")), _ns(v.get("storage")))
        if key not in seen or not _variant_has_price(v):
            seen[key] = v
    return list(seen.values())


# -----------------------------------------------------------------------
# Strategy 2: __NEXT_DATA__
# -----------------------------------------------------------------------

def _extract_from_next_data(html: str) -> list[dict]:
    candidates = []
    for script in re.finditer(r"<script[^>]*id=\"__NEXT_DATA__\"[^>]*>(.*?)</script>", html, re.S | re.I):
        try:
            data = json.loads(script.group(1))
        except json.JSONDecodeError:
            continue
        candidates.extend(_walk_data_for_variants(data))
    seen: dict[tuple, dict] = {}
    for v in candidates:
        key = (_ns(v.get("ram")), _ns(v.get("storage")))
        if key not in seen or not _variant_has_price(v):
            seen[key] = v
    return list(seen.values())


# -----------------------------------------------------------------------
# Strategy 3: JSON-LD
# -----------------------------------------------------------------------

def _extract_from_jsonld(html: str) -> list[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    out = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except Exception:
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
            offer_list = offers if isinstance(offers, list) else [offers]
            for offer in offer_list:
                if not isinstance(offer, dict):
                    continue
                for name_field in ("name", "description"):
                    offer_name = offer.get(name_field, "") or ""
                    m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", str(offer_name), re.I)
                    if not m:
                        continue
                    price_str = offer.get("price", "")
                    digits = re.sub(r"[^\d]", "", str(price_str))
                    price = int(digits) if digits else None
                    v = {
                        "ram": f"{m.group(1)} GB",
                        "storage": f"{m.group(2)} GB",
                        "price": price,
                        "flipkartPrice": price,
                    }
                    out.append(v)
    seen: dict[tuple, dict] = {}
    for v in out:
        key = (_ns(v.get("ram")), _ns(v.get("storage")))
        if key not in seen or not _variant_has_price(v):
            seen[key] = v
    return list(seen.values())


# -----------------------------------------------------------------------
# Strategy 4: window.__INITIAL_STATE__
# -----------------------------------------------------------------------

def _extract_from_initial_state(html: str) -> list[dict]:
    candidates = []
    for m in re.finditer(r"window\.__INITIAL_STATE__\s*=\s*", html, re.I):
        start = html.find("{", m.end())
        if start == -1:
            continue
        depth = 0
        end = None
        for i in range(start, len(html)):
            if html[i] == "{":
                depth += 1
            elif html[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end is None:
            continue
        chunk = html[start:end]
        try:
            data = json.loads(chunk)
        except json.JSONDecodeError:
            continue
        candidates.extend(_walk_data_for_variants(data))
    seen: dict[tuple, dict] = {}
    for v in candidates:
        key = (_ns(v.get("ram")), _ns(v.get("storage")))
        if key not in seen or not _variant_has_price(v):
            seen[key] = v
    return list(seen.values())


# -----------------------------------------------------------------------
# Strategy 5: text-pattern scan
# -----------------------------------------------------------------------

def _extract_from_text_pattern(html: str) -> list[dict]:
    found: dict[tuple, dict] = {}
    for el in re.finditer(r"\d+\s*GB\s*/\s*\d+\s*GB", html, re.I):
        m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", el.group(), re.I)
        if not m:
            continue
        key = (f"{m.group(1)} GB", f"{m.group(2)} GB")
        if key not in found:
            found[key] = {"ram": key[0], "storage": key[1], "price": None, "flipkartPrice": None}
    return list(found.values())


# -----------------------------------------------------------------------
# Shared helpers
# -----------------------------------------------------------------------

def _walk_data_for_variants(node):
    found = []
    if isinstance(node, dict):
        blob = " ".join(str(v) for v in node.values())
        m = re.search(r"(\d+)\s*GB\s*/\s*(\d+)\s*GB", blob, re.I)
        if m:
            price = _find_price(node)
            if price is not None:
                found.append({
                    "ram": f"{m.group(1)} GB",
                    "storage": f"{m.group(2)} GB",
                    "price": price,
                    "flipkartPrice": price,
                })
        for val in node.values():
            found.extend(_walk_data_for_variants(val))
    elif isinstance(node, list):
        for item in node:
            found.extend(_walk_data_for_variants(item))
    return found


def _find_price(node):
    """Non-recursive price extraction from a variant-shaped object."""
    if not isinstance(node, dict):
        return None
    for key in (
        "price", "value", "mrp", "mrpPrice", "sellingPrice",
        "offerPrice", "finalPrice", "discountedPrice", "cost", "effectivePrice",
    ):
        if key in node:
            p = _scalar_price(node[key])
            if p is not None:
                return p
        if isinstance(node.get(key), dict):
            for v in node[key].values():
                p = _scalar_price(v)
                if p is not None:
                    return p
    for v in node.values():
        p = _scalar_price(v)
        if p is not None:
            return p
    return None


def _scalar_price(value):
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


def _ns(value) -> str:
    if not value:
        return ""
    s = str(value).lower().strip()
    s = s.replace(" ", "").replace("gb", "").replace("ram", "").replace("rom", "")
    return s


_STRATEGIES = {
    "react_props": _extract_from_react_props,
    "next_data": _extract_from_next_data,
    "jsonld": _extract_from_jsonld,
    "initial_state": _extract_from_initial_state,
    "text_pattern": _extract_from_text_pattern,
}
