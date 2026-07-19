"""Local price-history store for historical validation (item 13).

The orchestrator only kept the single latest `price` + `lastPriceUpdatedAt`.
Item 13 asks us to compare a freshly scraped price against the *last ~10
prices* to reject one-off scrape/CAPTCHA artefacts that slip past the simpler
relative-delta guard. We persist a short rolling window per product id in a
JSON file (survives across runs on the same runner; harmless if missing).

This is deliberately a plain file, not Sanity: it's operational telemetry for
the sync, not product data the storefront needs.
"""
import json
import os
from statistics import median

# Keep at most this many recent prices per product.
HISTORY_WINDOW = 10
# A new price is rejected when it lies outside this multiple of the median of
# recent prices (with >=3 points of history). 2.0x catches the ₹12000-vs-25000
# "half price" CAPTCHA artefact that a single prior value might miss.
HISTORY_MULT = 2.0

_HISTORY_PATH = os.path.join(os.path.dirname(__file__), "price_history.json")


def load_history() -> dict:
    if not os.path.exists(_HISTORY_PATH):
        return {}
    try:
        with open(_HISTORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_history(history: dict) -> None:
    try:
        with open(_HISTORY_PATH, "w", encoding="utf-8") as f:
            json.dump(history, f)
    except Exception:
        pass


def record_price(product_id: str, price: int) -> None:
    """Append `price` to the rolling window for `product_id`."""
    history = load_history()
    prices = history.get(product_id, [])
    prices.append(price)
    history[product_id] = prices[-HISTORY_WINDOW:]
    save_history(history)


def history_consistent(new_price: int, product_id: str) -> "tuple[bool, str]":
    """Return (ok, reason). Rejects `new_price` when it is a clear outlier vs
    the recent price window (item 13). With <3 points we can't judge a trend,
    so we defer to the relative-delta guard upstream and accept."""
    if new_price is None or new_price <= 0:
        return False, "new_price_invalid"
    prices = load_history().get(product_id, [])
    if len(prices) < 3:
        return True, ""
    med = median(prices)
    if med <= 0:
        return True, ""
    if new_price < med / HISTORY_MULT or new_price > med * HISTORY_MULT:
        return False, f"history_outlier(new={new_price},median={int(med)})"
    return True, ""
