"""Central fetch manager — the ONLY place that decides *how* to get HTML.

Every scraper routes its network access through `FetchManager` so the retry /
session-recreation / browser-fallback / (future) proxy decisions live in one
spot instead of being duplicated and diverging across `flipkart.py` /
`amazon.py`. This is Phase 1 (items 1-3) of the resilience roadmap; it is
deliberately proxy-pluggable (item 7) but ships with no provider wired.

Decision tree:

    fetch(url)
      │
      ├─ curl_cffi request (fresh session, cached cookies)
      │     ├─ OK, real page ─────────────► return html
      │     ├─ BOT_PAGE ──────────────────► go to browser (skip more HTTP)
      │     └─ TIMEOUT / CONN / ERROR ────► new session, retry, then browser
      │
      └─ Playwright (cached cookies injected)
            ├─ OK, real page ─────────────► return html
            └─ BOT_PAGE / TIMEOUT ────────► return failure + stage

No scraper decides retry/rotate/session/browser — that's the manager's job.
"""
import time
from dataclasses import dataclass, field

# ─── Typed failure taxonomy (item 2) ────────────────────────────────────────
# These replace the single generic "ERROR". They make triage grep-able:
#   CONNECT_TIMEOUT, READ_TIMEOUT, DNS_FAILURE, TLS_FAILURE, HTTP_403, HTTP_429,
#   BOT_PAGE, CAPTCHA, EMPTY_HTML, PARSER_FAILED, VALIDATION_FAILED, OK.
FT_OK = "ok"
FT_CONNECT_TIMEOUT = "connect_timeout"
FT_READ_TIMEOUT = "read_timeout"
FT_DNS_FAILURE = "dns_failure"
FT_TLS_FAILURE = "tls_failure"
FT_HTTP_403 = "http_403"
FT_HTTP_429 = "http_429"
FT_BOT_PAGE = "bot_page"
FT_CAPTCHA = "captcha"
FT_EMPTY_HTML = "empty_html"
FT_PARSER_FAILED = "parser_failed"
FT_VALIDATION_FAILED = "validation_failed"
FT_BROWSER_TIMEOUT = "browser_timeout"
FT_BROWSER_BOT = "browser_bot"

# Legs (which path produced the result).
STAGE_HTTP = "http"
STAGE_BROWSER = "browser"


@dataclass
class FetchOutcome:
    """Result of a full fetch attempt (HTTP + browser fallback)."""
    ok: bool
    html: str | None = None
    # The most specific failure type if ok is False (one of FT_*).
    failure: str = FT_OK
    # Which leg ultimately produced the html: "http" or "browser".
    source: str | None = None
    # Per-leg detail, useful for metrics: {leg: failure_type}
    legs: dict = field(default_factory=dict)
    bot_seen: bool = False


def _classify_http_error(exc) -> str:
    """Map a curl_cffi/requests exception to a typed failure (item 2)."""
    name = type(exc).__name__
    msg = str(exc).lower()
    if "timeout" in name.lower() or "timeout" in msg:
        if "connect" in msg or "connect" in name.lower():
            return FT_CONNECT_TIMEOUT
        return FT_READ_TIMEOUT
    if "nameresolution" in msg or "getaddrinfo" in msg or "name or service" in msg:
        return FT_DNS_FAILURE
    if "ssl" in msg or "tls" in msg or "certificate" in msg:
        return FT_TLS_FAILURE
    if "403" in msg:
        return FT_HTTP_403
    if "429" in msg:
        return FT_HTTP_429
    return FT_CONNECT_TIMEOUT  # default transient network failure


class ProxyManager:
    """Pluggable proxy abstraction (item 7).

    Ships with a direct (no-proxy) implementation. To add providers later,
    subclass and override `next_proxy()` to rotate residential/ISP proxies.
    The FetchManager only ever calls `apply(session)` / `apply_context(ctx)`,
    so scraper code never touches proxy selection.
    """

    def next_proxy(self) -> str | None:
        return None  # direct connection

    def apply(self, session) -> None:
        proxy = self.next_proxy()
        if proxy:
            try:
                session.proxies.update({"http": proxy, "https": proxy})
            except Exception:
                pass

    def apply_context(self, context) -> None:
        proxy = self.next_proxy()
        if proxy:
            try:
                context.set_proxy(proxy)
            except Exception:
                pass


class FetchManager:
    """Decides retry / fresh-session / browser-fallback / proxy (item 1, 3).

    Usage:
        fm = FetchManager(domain="flipkart.com", base_url="https://www.flipkart.com/")
        outcome = fm.fetch(url)
        if outcome.ok:
            price, conf = parse(outcome.html)
    """

    def __init__(self, domain: str, base_url: str,
                 proxy: "ProxyManager | None" = None,
                 http_retries: int = 3, browser_retries: int = 2):
        self.domain = domain
        self.base_url = base_url
        self.proxy = proxy or ProxyManager()
        self.http_retries = http_retries
        self.browser_retries = browser_retries

    def _http_pass(self, url: str) -> "tuple[str | None, str, dict]":
        """One curl_cffi pass with a fresh session + cached cookies (items 3,5).

        Returns (html, failure_type, legs_detail). On a bot page we return
        FT_BOT_PAGE so the caller escalates to the browser immediately instead
        of wasting remaining HTTP attempts.
        """
        from http_helper import get_warm_session, get_with_retry
        session = get_warm_session(self.domain, self.base_url)
        self.proxy.apply(session)
        legs: dict = {}
        result = get_with_retry(session, url, timeout=30, max_tries=2)
        if result.ok:
            return result.html, FT_OK, legs
        if result.stage == "http_bot":
            return None, FT_BOT_PAGE, {"http": FT_BOT_PAGE}
        if result.stage == "http_timeout":
            return None, FT_CONNECT_TIMEOUT, {"http": FT_CONNECT_TIMEOUT}
        return None, FT_VALIDATION_FAILED, {"http": result.stage}

    def _browser_pass(self, url: str) -> "tuple[str | None, str, dict]":
        """One Playwright pass, injecting cached cookies (items 4,5 hook)."""
        from http_helper import get_warm_session, is_interstitial, random_user_agent
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
        from playwright_stealth import stealth_sync
        legs: dict = {}
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                try:
                    context = browser.new_context(
                        user_agent=random_user_agent(),
                        locale="en-IN",
                    )
                    self.proxy.apply_context(context)
                    page = context.new_page()
                    stealth_sync(page)
                    page.set_default_timeout(60000)
                    try:
                        page.goto(url, wait_until="commit", timeout=20000)
                        time.sleep(2)
                        try:
                            page.wait_for_load_state("networkidle", timeout=20000)
                        except PwTimeout:
                            pass
                        content = page.content()
                        if not content or len(content) < 200:
                            legs["browser"] = FT_EMPTY_HTML
                            return None, FT_EMPTY_HTML, legs
                        if is_interstitial(content):
                            legs["browser"] = FT_BOT_PAGE
                            return None, FT_BOT_PAGE, legs
                        return content, FT_OK, legs
                    except PwTimeout:
                        legs["browser"] = FT_BROWSER_TIMEOUT
                        return None, FT_BROWSER_TIMEOUT, legs
                    except Exception as e:
                        name = type(e).__name__.lower()
                        ft = FT_TLS_FAILURE if "ssl" in name or "tls" in name else FT_BROWSER_TIMEOUT
                        legs["browser"] = ft
                        return None, ft, legs
                finally:
                    browser.close()
        except Exception as e:
            print(f"    fetch_manager: browser launch failed ({e})")
            legs["browser"] = FT_BROWSER_TIMEOUT
            return None, FT_BROWSER_TIMEOUT, legs

    def fetch(self, url: str) -> FetchOutcome:
        """Run the decision tree: HTTP first (fresh session per attempt), then
        escalate to the browser on bot-page or repeated failure."""
        bot_seen = False
        for attempt in range(1, self.http_retries + 1):
            html, failure, legs = self._http_pass(url)
            if html is not None:
                return FetchOutcome(ok=True, html=html, source=STAGE_HTTP, legs=legs)
            if failure == FT_BOT_PAGE:
                bot_seen = True
                print(f"    fetch_manager: HTTP bot page (attempt {attempt}); → browser")
                break  # don't burn more HTTP attempts on a bot wall
            if attempt < self.http_retries:
                time.sleep(min(2 ** attempt, 8))

        for attempt in range(1, self.browser_retries + 1):
            html, failure, legs = self._browser_pass(url)
            if html is not None:
                return FetchOutcome(ok=True, html=html, source=STAGE_BROWSER,
                                    legs=legs, bot_seen=bot_seen)
            if attempt < self.browser_retries:
                time.sleep(2)

        failure = FT_BOT_PAGE if bot_seen else FT_CONNECT_TIMEOUT
        return FetchOutcome(ok=False, html=None, failure=failure,
                            legs=legs, bot_seen=bot_seen)
