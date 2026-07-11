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
