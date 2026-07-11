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
        assert doc["enabled"] is False
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
