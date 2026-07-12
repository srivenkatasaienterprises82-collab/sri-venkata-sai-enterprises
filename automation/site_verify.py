"""Verify that the LIVE storefront shows the same price Sanity holds.

The price-sync pipeline only compares the scraped marketplace price against
Sanity (`price-changes.csv`). It never actually fetches the storefront, so a
bug that silently breaks rendering (e.g. the earlier `filterResponse:false`
envelope that showed `undefined` prices) passed every check while customers
saw garbage. This script closes that gap:

    Sanity `price`  <--compare-->  price rendered on the live PDP

For every enabled product that has a numeric `price` and a slug, it fetches
`{SITE_URL}/products/{slug}` and extracts the price from the page's JSON-LD
(`"price": <n>`, authoritative) falling back to the visible `₹<n>` text. Any
mismatch, fetch error, or missing price is logged to `site_price_mismatch.csv`
and the process exits non-zero so the workflow is reported red.
"""

import csv
import os
import re
import sys

import requests

from sanity_api import fetch_all_products

SITE_URL = os.getenv("SITE_URL", "https://www.srivenkatasaienterprises.com").rstrip("/")
OUT_CSV = os.getenv("SITE_PRICE_CSV", "site_price_mismatch.csv")
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; SitePriceVerifyBot/1.0; "
        "+https://www.srivenkatasaienterprises.com)"
    )
}

# JSON-LD `"price": 12999` — the structured data always reflects the price the
# page actually renders (product.price), so it's the most reliable single
# source. Quotes/string-or-number variants both match.
_JSONLD_RE = re.compile(r'"price"\s*:\s*"?(\d+(?:\.\d+)?)"?')
# Visible rupee amount, e.g. "₹12,999" — used only as a fallback.
_RUPEE_RE = re.compile(r"₹\s?([\d,]+(?:\.\d{2})?)")


def extract_price(html: str):
    """Return the integer price shown on the page, or None if not found."""
    m = _JSONLD_RE.search(html)
    if m:
        return int(float(m.group(1)))
    m = _RUPEE_RE.search(html)
    if m:
        return int(float(m.group(1).replace(",", "")))
    return None


def verify_products(products, site_url: str = SITE_URL, session=None):
    """Return a list of result dicts for every checkable product.

    Each dict: {name, slug, sanity_price, live_price, status, detail}.
    status is one of: ok | mismatch | no_price | http_error | error.
    Products with no slug or a null price are skipped (not returned).
    """
    sess = session or requests.Session()
    results = []
    for p in products:
        # Mirror the live query's `enabled != false` filter: only explicitly
        # disabled (draft) products are hidden from the storefront, so only
        # those are skipped. `enabled` unset/true/null all mean "shown".
        if p.get("enabled") is False:
            continue
        slug = (p.get("slug") or {}).get("current")
        sanity_price = p.get("price")
        if not slug or sanity_price is None:
            # Price-on-enquiry products (e.g. Infinix Gaming Kit) — skip.
            continue
        sanity_price = int(sanity_price)
        url = f"{site_url}/products/{slug}"
        try:
            r = sess.get(url, headers=HEADERS, timeout=30)
        except Exception as e:  # network / TLS / timeout
            results.append({
                "name": p.get("name"), "slug": slug, "sanity_price": sanity_price,
                "live_price": None, "status": "error", "detail": str(e)[:160],
            })
            continue
        if r.status_code != 200:
            results.append({
                "name": p.get("name"), "slug": slug, "sanity_price": sanity_price,
                "live_price": None, "status": "http_error",
                "detail": f"HTTP {r.status_code}",
            })
            continue
        live = extract_price(r.text)
        if live is None:
            results.append({
                "name": p.get("name"), "slug": slug, "sanity_price": sanity_price,
                "live_price": None, "status": "no_price",
                "detail": "price not found in rendered HTML",
            })
            continue
        status = "ok" if live == sanity_price else "mismatch"
        results.append({
            "name": p.get("name"), "slug": slug, "sanity_price": sanity_price,
            "live_price": live, "status": status,
            "detail": "" if status == "ok" else f"live={live} sanity={sanity_price}",
        })
    return results


def main():
    products = fetch_all_products()
    results = verify_products(products)

    checked = len(results)
    failures = [r for r in results if r["status"] != "ok"]

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "slug", "sanity_price", "live_price", "status", "detail"])
        for r in failures:
            w.writerow([r["name"], r["slug"], r["sanity_price"],
                        r["live_price"], r["status"], r["detail"]])

    ok = checked - len(failures)
    print(f"Site price verification: {ok}/{checked} OK, {len(failures)} problem(s)")
    for r in failures:
        print(f"  [{r['status']}] {r['name']} ({r['slug']}): {r['detail']}")

    if failures:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
