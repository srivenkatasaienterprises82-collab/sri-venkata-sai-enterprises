import automation.http_helper as hh
from unittest.mock import patch


def test_user_agent_pool_is_nonempty_and_desktop():
    assert len(hh.USER_AGENTS) >= 3
    for ua in hh.USER_AGENTS:
        assert "Mozilla/5.0" in ua
        # No placeholder / empty UA strings.
        assert ua.strip()


def test_random_user_agent_returns_a_pool_member():
    for _ in range(20):
        assert hh.random_user_agent() in hh.USER_AGENTS


def test_new_session_carries_browser_headers_and_cookiejar():
    s = hh.new_session()
    assert isinstance(s, __import__("requests").Session)
    # Browser-like headers should be present (the absence is a strong bot signal).
    for key in ("User-Agent", "sec-ch-ua", "sec-fetch-mode", "Accept-Language"):
        assert key in s.headers
    # A fresh session still starts with no cookies (we just reuse it across a scrape).
    assert len(s.cookies) == 0


def test_is_interstitial_detects_bot_walls():
    assert hh.is_interstitial("<html>Please verify you are human</html>")
    assert hh.is_interstitial("<div>Robot Check</div>")
    assert hh.is_interstitial("<body>unusual traffic from your network</body>")
    # Empty body means "no data" -> treat as interstitial (skip safely).
    assert hh.is_interstitial("")


def test_is_interstitial_accepts_real_product_pages():
    real = "<html><title>Samsung Galaxy S26+ (256 GB)</title>" \
           "<script type='application/ld+json'>{\"price\":\"94999\"}</script></html>"
    assert hh.is_interstitial(real) is False


def test_get_with_retry_returns_none_on_interstitial():
    class _Resp:
        status_code = 200
        text = "Robot Check — please verify you are human"
    with patch.object(hh.time, "sleep"):
        s = hh.new_session()
        with patch.object(s, "get", return_value=_Resp()):
            assert hh.get_with_retry(s, "https://example.com/x") is None


def test_get_with_retry_returns_response_on_good_page():
    class _Resp:
        status_code = 200
        text = "<title>Real Product</title>"
    with patch.object(hh.time, "sleep"):
        s = hh.new_session()
        with patch.object(s, "get", return_value=_Resp()):
            resp = hh.get_with_retry(s, "https://example.com/x")
            assert resp is not None
            assert resp.status_code == 200


def test_get_with_retry_rotates_ua_across_attempts():
    class _Resp:
        status_code = 200
        text = "Robot Check"
    seen = []
    orig_choice = hh.random_user_agent

    def _spy():
        ua = orig_choice()
        seen.append(ua)
        return ua

    with patch.object(hh, "random_user_agent", _spy), \
         patch.object(hh.time, "sleep"):
        s = hh.new_session()
        with patch.object(s, "get", return_value=_Resp()):
            hh.get_with_retry(s, "https://example.com/x")
    # new_session() picks one UA, then each retry attempt rotates again (2).
    assert len(seen) == 3
