from automation.fetch_manager import (
    FetchManager,
    ProxyManager,
    _classify_http_error,
    FT_CONNECT_TIMEOUT,
    FT_READ_TIMEOUT,
    FT_DNS_FAILURE,
    FT_TLS_FAILURE,
    FT_HTTP_403,
    FT_HTTP_429,
)


class _Timeout(Exception):
    pass


def test_classify_connect_timeout():
    e = _Timeout()
    e.__class__.__name__ = "ConnectTimeoutError"
    assert _classify_http_error(e) == FT_CONNECT_TIMEOUT


def test_classify_read_timeout():
    e = _Timeout()
    e.__class__.__name__ = "ReadTimeout"
    assert _classify_http_error(e) == FT_READ_TIMEOUT


def test_classify_dns_failure():
    class _E(Exception):
        pass
    e = _E("getaddrinfo failed: name or service not known")
    assert _classify_http_error(e) == FT_DNS_FAILURE


def test_classify_tls_failure():
    class _E(Exception):
        pass
    e = _E("SSL: CERTIFICATE_VERIFY_FAILED")
    assert _classify_http_error(e) == FT_TLS_FAILURE


def test_classify_http_403_429():
    class _E(Exception):
        pass
    assert _classify_http_error(_E("403 forbidden")) == FT_HTTP_403
    assert _classify_http_error(_E("429 too many requests")) == FT_HTTP_429


def test_proxy_manager_direct_is_noop():
    # Default ProxyManager applies nothing (direct connection) and never raises.
    pm = ProxyManager()
    assert pm.next_proxy() is None
    fake_session = {"proxies": {}}
    pm.apply(fake_session)
    assert fake_session["proxies"] == {}
    pm.apply_context(object())


def test_fetch_manager_escalates_bot_to_browser(monkeypatch):
    # If HTTP returns a bot page, the manager must skip further HTTP and call
    # the browser pass (item 3: warm Playwright earlier), not retry HTTP.
    fm = FetchManager("example.com", "https://example.com/", http_retries=3, browser_retries=1)

    class _Res:
        ok = False
        stage = "http_bot"
        html = None

    monkeypatch.setattr("http_helper.get_with_retry", lambda *a, **k: _Res())
    monkeypatch.setattr("http_helper.get_warm_session", lambda *a, **k: object())
    browser_calls = []

    def _fake_browser(self, url):
        browser_calls.append(url)
        return ("<html><title>Real</title></html>", "ok", {})
    monkeypatch.setattr(FetchManager, "_browser_pass", _fake_browser)

    out = fm.fetch("https://example.com/p")
    assert out.ok is True
    assert out.source == "browser"
    assert browser_calls == ["https://example.com/p"]


def test_fetch_manager_http_ok_short_circuits(monkeypatch):
    fm = FetchManager("example.com", "https://example.com/", http_retries=3, browser_retries=1)

    class _Res:
        ok = True
        stage = "http_ok"
        html = "<html><title>Real</title></html>"

    monkeypatch.setattr("http_helper.get_with_retry", lambda *a, **k: _Res())
    monkeypatch.setattr("http_helper.get_warm_session", lambda *a, **k: object())
    browser_calls = []
    monkeypatch.setattr(FetchManager, "_browser_pass",
                        lambda self, u: browser_calls.append(u) or ("", "empty", {}))
    out = fm.fetch("https://example.com/p")
    assert out.ok is True
    assert out.source == "http"
    assert browser_calls == []  # browser must NOT run when HTTP succeeded
