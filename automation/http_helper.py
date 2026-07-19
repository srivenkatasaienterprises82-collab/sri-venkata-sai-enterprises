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
import json
import os
import random
import re
import tempfile
import time
from dataclasses import dataclass

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


# ─── Fetch-stage taxonomy + metrics ──────────────────────────────────────────
# We distinguish *why* a fetch failed because bot-walls and network hiccups need
# different recovery: a bot page means "go straight to the browser"; a timeout
# means "retry the HTTP session with a fresh one first". Logging the stage (item
# 5 in the resilience review) makes trends visible instead of a generic ERROR.
STAGE_HTTP_OK = "http_ok"
STAGE_HTTP_TIMEOUT = "http_timeout"
STAGE_HTTP_BOT = "http_bot"
STAGE_HTTP_ERROR = "http_error"
STAGE_PW_OK = "playwright_ok"
STAGE_PW_TIMEOUT = "playwright_timeout"
STAGE_PW_BOT = "playwright_bot"
STAGE_PARSE_FAIL = "parse_failed"
STAGE_VALIDATION_FAIL = "validation_failed"


@dataclass
class FetchResult:
    """Outcome of a single fetch attempt, with the failing *stage* attached."""
    ok: bool
    html: str | None = None
    stage: str = STAGE_HTTP_OK
    session: object | None = None


def log_stage(stage: str, url: str = "") -> None:
    """Emit a single-line stage marker. Centralised so the metric vocabulary is
    consistent across both scrapers and easy to grep in CI logs / dashboards."""
    print(f"    [stage] {stage} {url}")


# ─── Proactive cookie cache (items 4 + 6) ────────────────────────────────────
# A warmed Playwright session is expensive. Instead of re-warming on every
# failure (and losing it on an ephemeral runner restart), we cache the cookies
# to a JSON file and refresh on a schedule (every COOKIE_TTL_SECONDS). curl_cffi
# then starts every run from a realistic, already-verified browser state.
COOKIE_TTL_SECONDS = 12 * 3600
_COOKIE_DIR = os.path.join(tempfile.gettempdir(), "svse_cookies")


def _cookie_path(domain: str) -> str:
    safe = re.sub(r"[^a-z0-9.]", "_", domain.lower())
    return os.path.join(_COOKIE_DIR, f"{safe}.json")


def _load_cached_cookies(domain: str) -> tuple[list, float] | tuple[None, float]:
    path = _cookie_path(domain)
    if not os.path.exists(path):
        return None, 0.0
    try:
        with open(path, "r", encoding="utf-8") as f:
            blob = json.load(f)
        return blob.get("cookies", []), float(blob.get("saved_at", 0.0))
    except Exception:
        return None, 0.0


def _save_cached_cookies(domain: str, cookies: list) -> None:
    try:
        os.makedirs(_COOKIE_DIR, exist_ok=True)
        with open(_cookie_path(domain), "w", encoding="utf-8") as f:
            json.dump({"saved_at": time.time(), "cookies": cookies}, f)
    except Exception:
        pass  # best-effort; cache miss just means a cold start next time.


def get_warm_session(domain: str, base_url: str) -> object | None:
    """Return a curl_cffi/requests session carrying *fresh-enough* cookies.

    Proactively refreshes the cookie jar via Playwright only when the cache is
    missing or older than COOKIE_TTL_SECONDS (item 4). Otherwise it replays the
    persisted cookies from disk (item 6) so an ephemeral runner restart doesn't
    lose session state. Falls back to a cold `new_session()` on any failure.
    """
    cookies, saved_at = _load_cached_cookies(domain)
    fresh = (time.time() - saved_at) < COOKIE_TTL_SECONDS
    if fresh and cookies:
        s = new_session()
        _inject_cookies(s, domain, cookies)
        print(f"    warm_session: replayed {len(cookies)} cached cookie(s) for {domain}")
        return s
    # Cache stale/missing → re-warm in the browser and persist for next time.
    s = warm_session_with_playwright(domain, base_url)
    if s is not None:
        try:
            _save_cached_cookies(domain, _export_cookies(s))
        except Exception:
            pass
    return s


def _inject_cookies(session: object, domain: str, cookies: list) -> None:
    for c in cookies:
        cookie = {
            "name": c.get("name"),
            "value": c.get("value"),
            "domain": c.get("domain", domain),
            "path": c.get("path", "/"),
        }
        if not cookie["name"]:
            continue
        try:
            session.cookies.set(**cookie)
        except Exception:
            try:
                session.cookies.set(cookie["name"], cookie["value"])
            except Exception:
                continue


def _export_cookies(session: object) -> list:
    """Best-effort export of a session's cookies back to the Playwright shape."""
    try:
        return [
            {"name": k, "value": v, "domain": "", "path": "/"}
            for k, v in session.cookies.items()
        ]
    except Exception:
        return []


def warm_session_with_playwright(domain: str, base_url: str) -> object | None:
    """Warm a fresh HTTP session by first passing the bot-check in a real browser.

    Flipkart/Amazon serve a CAPTCHA / robot-check to a brand-new TLS session, but
    a *returning* visitor that already holds the clearance cookies usually sails
    straight through. So we:

      1. open `base_url` in headless Chromium with `playwright-stealth`,
      2. let any bot-check resolve (we don't solve CAPTCHAs — we just wait a beat
         for cookie-bearing redirects / soft checks to settle),
      3. export the browser's cookies for `domain` and inject them into a new
         curl_cffi (or requests) session.

    The returned session carries the warmed cookies, so the follow-up
    `get_with_retry` calls look like a verified return visitor instead of a fresh
    bot hit — which is the single biggest lever for beating the 503/403 walls.

    Returns None if Playwright isn't installed or the warm-up fails, so callers
    can fall back to a plain `new_session()`.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:  # pragma: no cover - depends on environment
        print("    warm_session: playwright not installed, skipping cookie warm-up")
        return None

    stealth = None
    try:
        from playwright_stealth import stealth_sync
    except ImportError:  # pragma: no cover - stealth is optional
        pass

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                context = browser.new_context(
                    user_agent=random_user_agent(),
                    locale="en-IN",
                    extra_http_headers={
                        "Accept-Language": "en-IN,en;q=0.9",
                        "Sec-Fetch-Dest": "document",
                        "Sec-Fetch-Mode": "navigate",
                        "Sec-Fetch-Site": "none",
                        "Sec-Fetch-User": "?1",
                    },
                )
                page = context.new_page()
                if stealth:
                    stealth_sync(page)
                try:
                    page.goto(base_url, timeout=45000, wait_until="domcontentloaded")
                except Exception as e:  # navigation may "hang" on a soft check
                    print(f"    warm_session: goto soft-fail ({e}); using cookies so far")
                # Give any JS-driven bot-check / redirect a moment to settle and
                # drop its clearance cookies. We don't solve CAPTCHAs — if it's a
                # hard CAPTCHA, the cookies simply won't include clearance and the
                # HTTP fallback will still hit the wall (safe, no wrong price).
                time.sleep(random.uniform(3, 6))
                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                raw_cookies = context.cookies(url=base_url)
            finally:
                browser.close()
    except Exception as e:
        print(f"    warm_session: browser warm-up failed ({e}); falling back")
        return None

    if not raw_cookies:
        print("    warm_session: no cookies collected; falling back to cold session")
        return None

    s = new_session()
    for c in raw_cookies:
        # curl_cffi and requests both accept a name/value/domain/path dict.
        cookie = {
            "name": c.get("name"),
            "value": c.get("value"),
            "domain": c.get("domain", domain),
            "path": c.get("path", "/"),
        }
        if not cookie["name"]:
            continue
        try:
            s.cookies.set(**cookie)
        except Exception:
            # requests needs domain; curl_cffi is lenient. Try the bare form.
            try:
                s.cookies.set(cookie["name"], cookie["value"])
            except Exception:
                continue
    print(f"    warm_session: injected {len(raw_cookies)} cookie(s) for {domain}")
    return s


def get_with_retry(session: requests.Session, url: str, *,
                   timeout=(5, 30), max_tries: int = 2) -> FetchResult:
    """GET `url`, returning a structured `FetchResult` that encodes *why* the
    fetch failed so the caller can pick the right recovery path.

    `timeout` is a (connect, read) tuple: a short 5s connect timeout fails fast
    when the marketplace silently drops the connection (GitHub Actions runners
    get `ConnectTimeoutError` from Flipkart/Amazon rather than a fast 403), so we
    move to the Playwright fallback instead of hanging. The 30s read budget
    still allows slow-but-real page loads.

    Returns:
      * `FetchResult(ok=True, html=..., stage=STAGE_HTTP_OK)` on a real 200 page.
      * `STAGE_HTTP_BOT` when a 200 response is a bot-check interstitial — the
        caller should go straight to Playwright (no point retrying HTTP).
      * `STAGE_HTTP_TIMEOUT` on a connect/read timeout — the caller should retry
        HTTP with a *fresh* session before escalating to Playwright (item 1/2).
      * `STAGE_HTTP_ERROR` on a non-timeout transport error / non-200 status.
    On a timeout we rebuild `session` with `new_session()` so the next attempt
    rides a brand-new TLS fingerprint rather than the one that just got dropped.
    """
    last_stage = STAGE_HTTP_ERROR
    for attempt in range(1, max_tries + 1):
        try:
            # Rotate UA + sec-ch-ua each attempt so a blocked fingerprint
            # doesn't recur on the retry.
            session.headers.update(_browser_headers(random_user_agent()))
            time.sleep(random.uniform(1.0, 2.5))
            resp = session.get(url, timeout=timeout)
            if resp.status_code != 200:
                print(f"    HTTP {resp.status_code} (attempt {attempt})")
                last_stage = STAGE_HTTP_ERROR
                continue
            if is_interstitial(resp.text):
                print("    Detected bot-check interstitial (attempt %d)" % attempt)
                last_stage = STAGE_HTTP_BOT
                # A bot page won't get better by retrying the same HTTP session;
                # surface it immediately so the caller can use the browser.
                return FetchResult(ok=False, html=None, stage=STAGE_HTTP_BOT,
                                   session=session)
            return FetchResult(ok=True, html=resp.text, stage=STAGE_HTTP_OK,
                               session=session)
        except (requests.Timeout, requests.ConnectionError) as e:
            # ConnectTimeoutError / ReadTimeout → transient network hiccup. Build
            # a fresh session for the next attempt (item 1) before giving up.
            last_stage = STAGE_HTTP_TIMEOUT
            print(f"    HTTP timeout/conn-error (attempt {attempt}): {e}")
            session = new_session()
            continue
        except requests.RequestException as e:
            last_stage = STAGE_HTTP_ERROR
            print(f"    request error (attempt {attempt}): {e}")
            continue
    log_stage(last_stage, url)
    return FetchResult(ok=False, html=None, stage=last_stage, session=session)


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
