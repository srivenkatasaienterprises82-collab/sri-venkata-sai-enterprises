"""Shared HTTP helpers for the marketplace scrapers.

The single biggest cause of "all prices are stale" is bot-blocking: Flipkart
and Amazon serve a Robot-Check / CAPTCHA interstitial (HTTP 200, but no real
product data) to datacenter IPs such as the GitHub Actions runner. The scrapers
already *detect* those interstitials and skip safely — but that still leaves the
product stale forever. Resilience (option B) has two prongs:

  1. AVOIDANCE — make the automated traffic look less bot-like so we get the
     real page more often in the first place. This module centralises that:
       * a rotating pool of realistic desktop User-Agents (not one static UA)
       * a browser-like header set (sec-ch-ua, sec-fetch-*, accept-encoding)
       * cookie-jar reuse via a `requests.Session` (returning visitors look
         more trustworthy than brand-new sessions every request)
       * a `is_interstitial()` detector shared by both scrapers so the
         click-detection logic lives in exactly one place.

  2. The orchestrator (`launch_checker.py`) layers cross-source fallback and
     freshness telemetry on top — see that file.
"""
import random
import re
import time

import requests

# `curl_cffi` mimics the TLS/JA3 fingerprint of a real Chrome browser, which is
# what gets past Flipkart/Amazon's TLS-fingerprinting (Akamai) bot checks that
# drop vanilla `requests` connections. It's optional: if it isn't installed we
# fall back to the stdlib `requests` session so the code still runs (just less
# stealthy). `curl_cffi_requests` is aliased to avoid shadowing `requests`.
try:
    from curl_cffi import requests as curl_cffi_requests
    CURL_CFFI_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    curl_cffi_requests = None
    CURL_CFFI_AVAILABLE = False

# Which Chrome build curl_cffi should impersonate. Kept as a single knob so it
# can be bumped when the marketplaces update their expected fingerprint.
IMPERSONATE = "chrome120"

# A small pool of current, realistic desktop UA strings. Rotating these (rather
# than sending the same one on every request) is the cheapest, highest-impact
# anti-bot-avoidance tweak: a single fixed UA is a classic bot fingerprint.
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
]

# Browser-like header template filled per-request with a rotated UA. The
# `sec-ch-ua*` / `sec-fetch-*` / `accept-encoding` trio is what a real Chrome
# nav sends and what headless/bare-`requests` traffic omits — its absence is a
# strong bot signal.
def _browser_headers(ua: str) -> dict:
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
    }


def random_user_agent() -> str:
    return random.choice(USER_AGENTS)


def new_session() -> object:
    """Return a cookie-jar session with a fresh rotated UA.

    Prefers a `curl_cffi` session impersonating Chrome (TLS-fingerprint
    stealth) when available; otherwise falls back to the stdlib `requests`
    session. Both expose `.get()` / `.headers`, so callers don't care which.

    Reusing the session (and thus its cookies) across a scrape makes the traffic
    look like a returning visitor rather than a fresh bot hit each time.
    """
    ua = random_user_agent()
    if CURL_CFFI_AVAILABLE:
        s = curl_cffi_requests.Session(impersonate=IMPERSONATE)
        s.headers.update(_browser_headers(ua))
        return s
    s = requests.Session()
    s.headers.update(_browser_headers(ua))
    return s


def get_with_retry(session: requests.Session, url: str, *,
                   timeout=(5, 30), max_tries: int = 2) -> requests.Response | None:
    """GET `url` on `session`, rotating the UA once on a soft failure.

    `timeout` is a (connect, read) tuple: a short 5s connect timeout fails fast
    when the marketplace silently drops the connection (GitHub Actions runners
    get `ConnectTimeoutError` from Flipkart/Amazon rather than a fast 403), so we
    move to the Playwright fallback instead of hanging. The 30s read budget
    still allows slow-but-real page loads.

    Returns the `Response` on HTTP 200, or None on non-200 / network error /
    being served an interstitial (callers should treat None as "no data").
    """
    last_exc = None
    for attempt in range(1, max_tries + 1):
        try:
            # Rotate UA + sec-ch-ua each attempt so a blocked fingerprint
            # doesn't recur on the retry.
            session.headers.update(_browser_headers(random_user_agent()))
            time.sleep(random.uniform(1.0, 2.5))
            resp = session.get(url, timeout=timeout)
            if resp.status_code != 200:
                print(f"    HTTP {resp.status_code} (attempt {attempt})")
                continue
            if is_interstitial(resp.text):
                print("    Detected bot-check interstitial (attempt %d)" % attempt)
                continue
            return resp
        except requests.RequestException as e:
            last_exc = e
            print(f"    request error (attempt {attempt}): {e}")
            continue
    if last_exc:
        print(f"    giving up after errors: {last_exc}")
    return None


# Tell-tale fragments that Flipkart / Amazon inject into their bot-check /
# CAPTCHA / "verify you are human" interstitials. A 200 response that contains
# one of these is NOT a product page even though it parses fine.
_INTERSTITIAL_MARKERS = (
    "robot check",
    "verify you are human",
    "confirm you are human",
    "are you a human",
    "enter the characters you see",
    "why did this happen?",
    "to continue please click",
    "automated access is disabled",
    "unusual traffic from your network",
    "captcha",
    "please verify",
)


def is_interstitial(html: str) -> bool:
    """Return True if `html` looks like a bot-check / CAPTCHA interstitial.

    Cheap, conservative: matches only unambiguous bot-wall copy. Real product
    pages occasionally contain the word "captcha" in reviews, but paired with
    the absence of product JSON-LD / title that still means we have no price to
    extract, so skipping is the safe call either way.
    """
    if not html:
        return True
    low = html.lower()
    return any(m in low for m in _INTERSTITIAL_MARKERS)
