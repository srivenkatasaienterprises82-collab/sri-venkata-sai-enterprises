import automation.flipkart as fk
import automation.sanity_api as sa
from bs4 import BeautifulSoup
from unittest.mock import patch


def _html(scripts: str) -> BeautifulSoup:
    return BeautifulSoup(f"<html><body>{scripts}</body></html>", "lxml")


def test_flipkart_next_data_extracts_priced_variants():
    # Flipkart renders variants from an inline __NEXT_DATA__ JSON blob. The
    # structured tree carries both the RAM/Storage label and a real price.
    blob = (
        '{"props":{"pageProps":{"productView":{'
        '  "variants":['
        '    {"name":"8 GB / 128 GB","price":{"value":24999}},'
        '    {"name":"12 GB / 256 GB","price":{"value":29999}}'
        '  ]}}}}'
    )
    soup = _html(f'<script id="__NEXT_DATA__">window.__NEXT_DATA__ = {blob};</script>')
    variants = fk._extract_variants_from_next_data(soup)
    by_key = {(v["ram"], v["storage"]): v["price"] for v in variants}
    assert by_key[("8 GB", "128 GB")] == 24999
    assert by_key[("12 GB", "256 GB")] == 29999


def test_flipkart_variants_merge_tier1_price_wins():
    # A text-pattern scan alone yields price=None; the inline JSON supplies the
    # price. The merge must keep the priced entry, not the price-less one.
    blob = (
        '{"props":{"pageProps":{"productView":{'
        '  "variants":[{"name":"8 GB / 128 GB","price":{"value":24999}}]}}}}'
    )
    html = (
        '<script id="__NEXT_DATA__">window.__NEXT_DATA__ = '
        f'{blob};</script>'
        '<div>Also see 8 GB / 128 GB in other colours</div>'
    )
    soup = _html(html)
    variants = fk._extract_flipkart_variants(soup)
    match = [v for v in variants if v["ram"] == "8 GB" and v["storage"] == "128 GB"]
    assert len(match) == 1
    assert match[0]["price"] == 24999


def test_flipkart_walk_for_variants_finds_ram_storage_price():
    node = {
        "someKey": "8 GB / 128 GB",
        "price": 24999,
        "nested": [{"label": "12 GB / 256 GB", "cost": 29999}],
    }
    found = fk._walk_for_variants(node)
    keys = {(v["ram"], v["storage"]): v["price"] for v in found}
    assert keys[("8 GB", "128 GB")] == 24999
    assert keys[("12 GB", "256 GB")] == 29999


def test_flipkart_next_data_ignores_non_variant_prices():
    # A blob with prices but no RAM/Storage label must NOT yield a variant.
    blob = '{"props":{"cart":[{"price":199}]}}'
    soup = _html(f'<script>window.__NEXT_DATA__ = {blob};</script>')
    assert fk._extract_variants_from_next_data(soup) == []


def test_flag_manual_review_sets_needs_review_after_threshold():
    # Three consecutive failures should flip needsManualReview on; a success
    # resets the counter.
    states = [
        {"syncFailCount": 0, "needsManualReview": False},
        {"syncFailCount": 1, "needsManualReview": False},
        {"syncFailCount": 2, "needsManualReview": False},
    ]

    def _query(q):
        return [states[0]] if states else []

    captured = {}

    class _Resp:
        status_code = 200
        text = '{"results":[{"id":"p1"}]}'

        def json(self):
            return {"results": [{"id": "p1"}]}

    def _mutate(mutations):
        captured["set"] = mutations["mutations"][0]["patch"]["set"]
        # Advance the simulated stored state for the next read.
        if states:
            states[0] = dict(captured["set"])
        return _Resp()

    with patch.object(sa, "_query", _query), patch.object(sa, "_mutate", _mutate):
        sa.flag_manual_review("p1", True)   # count 1
        assert captured["set"]["syncFailCount"] == 1
        assert captured["set"]["needsManualReview"] is False
        sa.flag_manual_review("p1", True)   # count 2
        assert captured["set"]["needsManualReview"] is False
        sa.flag_manual_review("p1", True)   # count 3 -> flagged
        assert captured["set"]["syncFailCount"] == 3
        assert captured["set"]["needsManualReview"] is True
        sa.flag_manual_review("p1", False)  # success resets
        assert captured["set"]["syncFailCount"] == 0
        assert captured["set"]["needsManualReview"] is False


def test_flag_manual_review_raises_on_error():
    class _Resp:
        status_code = 500
        text = '{"error":"boom"}'

        def json(self):
            return {"error": "boom"}

    with patch.object(sa, "_query", return_value=[]), \
         patch.object(sa.requests, "post", lambda *a, **k: _Resp()):
        try:
            sa.flag_manual_review("p1", True)
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass
