import automation.sanity_api as sa
from unittest.mock import patch


def test_fetch_brand_id_returns_id():
    fake = {"result": [{"_id": "brand-xyz"}]}
    with patch("automation.sanity_api.requests.get") as g:
        g.return_value.status_code = 200
        g.return_value.json.return_value = fake
        assert sa.fetch_brand_id("Motorola") == "brand-xyz"


def test_fetch_category_id_falls_back():
    seq = [
        {"result": []},
        {"result": [{"_id": "cat-mobile"}]},
    ]
    with patch("automation.sanity_api.requests.get") as g:
        g.return_value.status_code = 200
        g.return_value.json.side_effect = lambda: seq.pop(0)
        assert sa.fetch_category_id("smartphone") == "cat-mobile"


def test_unique_slug_avoids_collision():
    with patch.object(sa, "fetch_existing_slugs", return_value={"iphone-17", "iphone-17-2"}):
        assert sa.unique_slug("iPhone 17") == "iphone-17-3"


def test_create_full_product_builds_draft_doc():
    details = {
        "price": 82900,
        "images": ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
        "description": "A great phone.",
        "specifications": [{"label": "RAM", "value": "8 GB"}],
        "colors": [{"name": "Black", "hex": "#000000"}],
        "variants": [{"ram": "8 GB", "storage": "128 GB", "price": 82900}],
    }
    with patch.object(sa, "fetch_brand_id", return_value="brand-moto"), \
         patch.object(sa, "fetch_category_id", return_value="cat-phone"), \
         patch.object(sa, "unique_slug", return_value="moto-g"), \
         patch.object(sa, "create") as c:
        sa.create_full_product("Moto G", "Motorola", "flipkart",
                               "https://flipkart.com/p/moto-g", details)
        doc = c.call_args[0][0]
        assert doc["_type"] == "product"
        assert doc["enabled"] is True
        assert doc["type"] == "smartphone"
        assert doc["stock"] == "in-stock"
        assert doc["brand"] == {"_ref": "brand-moto", "_type": "reference"}
        assert doc["category"] == {"_ref": "cat-phone", "_type": "reference"}
        assert doc["coverImage"] == "https://cdn.example.com/a.jpg"
        assert doc["images"] == details["images"]
        assert doc["flipkartUrl"] == "https://flipkart.com/p/moto-g"
        assert doc["amazonUrl"] is None


def test_create_full_product_skips_without_brand():
    with patch.object(sa, "fetch_brand_id", return_value=None), \
         patch.object(sa, "create") as c:
        res = sa.create_full_product("X", "UnknownBrand", "flipkart", "u", {})
        assert res is None
        c.assert_not_called()


def test_update_price_only_sets_provided_marketplace():
    # A single-source (Flipkart) scrape must NOT send amazonPrice: null,
    # which would wipe the Amazon price we already store.
    captured = {}

    class _Resp:
        status_code = 200
        text = '{"results":[{"id":"p1"}]}'

        def json(self):
            return {"results": [{"id": "p1"}]}

    def _post(url, headers=None, json=None):
        captured["json"] = json
        return _Resp()

    with patch.object(sa.requests, "post", _post):
        sa.update_price("p1", None, 19999, 19999)
    set_fields = captured["json"]["mutations"][0]["patch"]["set"]
    assert "flipkartPrice" in set_fields
    assert set_fields["flipkartPrice"] == 19999
    assert "amazonPrice" not in set_fields  # crucial: don't wipe it
    assert set_fields["price"] == 19999


def test_update_price_raises_on_error():
    class _Resp:
        status_code = 500
        text = '{"error":"boom"}'

        def json(self):
            return {"error": "boom"}

    with patch.object(sa.requests, "post", lambda *a, **k: _Resp()):
        try:
            sa.update_price("p1", 100, 200, 150)
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass


def _capture_post():
    captured = {}

    class _Resp:
        status_code = 200
        text = '{"results":[{"id":"p1"}]}'

        def json(self):
            return {"results": [{"id": "p1"}]}

    def _post(url, headers=None, json=None):
        captured["json"] = json
        return _Resp()

    return captured, _post


def test_update_variants_scales_to_scraped_price():
    # Single scraped price (no per-variant break-down) should NUDGE the existing
    # tiers so variant prices slightly track the market, not snap exactly.
    captured, _post = _capture_post()
    existing = [
        {"ram": "12GB", "storage": "256GB", "price": 57999},
        {"ram": "16GB", "storage": "512GB", "price": 67999},
        {"ram": "24GB", "storage": "1TB", "price": 82999},
    ]
    with patch.object(sa.requests, "post", _post):
        sa.update_price_and_variants("p1", "OnePlus 13", 65000, None, 65000, [], existing)
    set_fields = captured["json"]["mutations"][0]["patch"]["set"]
    variants = set_fields["variants"]
    by_ram = {v["ram"]: v["price"] for v in variants}
    scale = 65000 / 57999
    blend = 1.0 + sa.VARIANT_SCALE_BLEND * (scale - 1.0)
    # Blended (slight) move, strictly between the old price and the full scale.
    for ram, old in (("12GB", 57999), ("16GB", 67999), ("24GB", 82999)):
        expected = round(old * blend)
        assert by_ram[ram] == expected
        full = round(old * scale)
        assert by_ram[ram] != full  # proves it's a SLIGHT match, not exact
        assert min(old, full) < by_ram[ram] < max(old, full)
    assert set_fields["price"] == 65000


def test_update_variants_blocks_outlier_scale():
    # An absurd scraped price must NOT corrupt the per-variant tiers.
    captured, _post = _capture_post()
    existing = [
        {"ram": "12GB", "storage": "256GB", "price": 57999},
        {"ram": "16GB", "storage": "512GB", "price": 67999},
    ]
    with patch.object(sa.requests, "post", _post):
        sa.update_price_and_variants("p1", "OnePlus 13", 999999, None, 999999, [], existing)
    variants = captured["json"]["mutations"][0]["patch"]["set"]["variants"]
    by_ram = {v["ram"]: v["price"] for v in variants}
    assert by_ram["12GB"] == 57999
    assert by_ram["16GB"] == 67999


def test_update_variants_exact_scrape_wins():
    # A matching scraped variant price is applied directly (no scaling).
    captured, _post = _capture_post()
    existing = [
        {"ram": "12GB", "storage": "256GB", "price": 57999},
        {"ram": "16GB", "storage": "512GB", "price": 67999},
    ]
    scraped = [{"ram": "16GB", "storage": "512GB", "price": 70000}]
    with patch.object(sa.requests, "post", _post):
        sa.update_price_and_variants("p1", "OnePlus 13", 65000, None, 65000, scraped, existing)
    variants = captured["json"]["mutations"][0]["patch"]["set"]["variants"]
    by_ram = {v["ram"]: v["price"] for v in variants}
    assert by_ram["16GB"] == 70000
    assert by_ram["12GB"] == 57999


def test_update_variants_matches_with_spacing_differences():
    # "8 GB" in Sanity should match "8GB" from the scraper (unit/space
    # normalization), so the correct tier gets the exact scraped price.
    captured, _post = _capture_post()
    existing = [
        {"ram": "8 GB", "storage": "128 GB", "price": 24999},
        {"ram": "12 GB", "storage": "256 GB", "price": 28999},
    ]
    scraped = [{"ram": "8GB", "storage": "128GB", "price": 23999}]
    with patch.object(sa.requests, "post", _post):
        sa.update_price_and_variants("p1", "Moto Edge", 23999, None, 23999, scraped, existing)
    variants = captured["json"]["mutations"][0]["patch"]["set"]["variants"]
    by_ram = {v["ram"]: v["price"] for v in variants}
    assert by_ram["8 GB"] == 23999  # matched despite spacing diff
    assert by_ram["12 GB"] == 28999


def test_update_price_retries_transient_5xx_then_succeeds():
    # _mutate must retry on 503/429 and return the eventual 2xx body rather
    # than raising — so a brief Sanity outage doesn't fail the whole sync run.
    calls = {"n": 0}

    class _Resp:
        text = '{"results":[{"id":"p1"}]}'

        def __init__(self, code):
            self.status_code = code

        def json(self):
            return {"results": [{"id": "p1"}]}

    def _post(url, headers=None, json=None):
        calls["n"] += 1
        # First two attempts are transient 503, third succeeds.
        return _Resp(503 if calls["n"] < 3 else 200)

    with patch.object(sa.requests, "post", _post):
        res = sa.update_price("p1", None, 19999, 19999)
    assert calls["n"] == 3
    assert res["results"][0]["id"] == "p1"


def test_update_price_surfaces_non_transient_4xx():
    # A 400/401/403 is NOT retried (it won't fix itself) and must raise so the
    # orchestrator counts the failure and exits non-zero.
    calls = {"n": 0}

    class _Resp:
        status_code = 400
        text = '{"error":"bad request"}'

        def json(self):
            return {"error": "bad request"}

    def _post(url, headers=None, json=None):
        calls["n"] += 1
        return _Resp()

    with patch.object(sa.requests, "post", _post):
        try:
            sa.update_price("p1", 100, 200, 150)
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass
    assert calls["n"] == 1  # no retries on non-transient 4xx


def test_record_freshness_writes_status_field():
    # Freshness telemetry must land in a `set` patch with lastScrapedAt +
    # scrapeStatus and NOT touch price/variant data.
    captured = {}

    class _Resp:
        status_code = 200
        text = '{"results":[{"id":"p1"}]}'

        def json(self):
            return {"results": [{"id": "p1"}]}

    def _post(url, headers=None, json=None):
        captured["json"] = json
        return _Resp()

    with patch.object(sa.requests, "post", _post):
        sa.record_freshness("p1", "ok")
    set_fields = captured["json"]["mutations"][0]["patch"]["set"]
    assert set_fields["scrapeStatus"] == "ok"
    assert "lastScrapedAt" in set_fields
    assert "price" not in set_fields
    assert "variants" not in set_fields


def test_record_freshness_raises_on_failure():
    class _Resp:
        status_code = 500
        text = '{"error":"boom"}'

        def json(self):
            return {"error": "boom"}

    with patch.object(sa.requests, "post", lambda *a, **k: _Resp()):
        try:
            sa.record_freshness("p1", "blocked")
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass


