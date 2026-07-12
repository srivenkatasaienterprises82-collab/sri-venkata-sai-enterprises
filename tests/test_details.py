import automation.flipkart as FK
import automation.amazon as AMZ
from pathlib import Path
from bs4 import BeautifulSoup

FIX = Path(__file__).parent / "fixtures"


def test_flipkart_details_extracts_all():
    html = (FIX / "flipkart_detail.html").read_text()
    d = FK._parse_flipkart_details(html)
    assert d["price"] == 17999
    assert len(d["images"]) == 2
    assert all("rukminim" in u for u in d["images"])
    assert d["description"].startswith("The Motorola G85")
    assert {"label": "RAM", "value": "8 GB"} in d["specifications"]
    assert len(d["colors"]) == 2
    assert d["colors"][0] == {"name": "Cobalt Blue", "hex": "#1a237e"}
    assert {"ram": "8 GB", "storage": "128 GB", "price": None} in d["variants"]
    assert {"ram": "12 GB", "storage": "256 GB", "price": None} in d["variants"]


def test_amazon_details_extracts_all():
    html = (FIX / "amazon_detail.html").read_text()
    d = AMZ._parse_amazon_details(html)
    assert d["price"] == 19999
    assert len(d["images"]) == 3
    assert all("media-amazon.com" in u for u in d["images"])
    assert d["description"].startswith("The iQOO Z9")
    assert {"label": "RAM", "value": "8 GB"} in d["specifications"]
    assert len(d["colors"]) == 2
    assert d["colors"][1] == {"name": "Ice Blue", "hex": "#4fc3f7"}
    assert {"ram": "12 GB", "storage": "256 GB", "price": None} in d["variants"]


def test_flipkart_details_handles_empty():
    d = FK._parse_flipkart_details("<html><body></body></html>")
    assert d["price"] is None
    assert d["images"] == []
    assert d["specifications"] == []
    assert d["colors"] == []
    assert d["variants"] == []


# ── JSON-LD variant price extraction tests ──────────────────────────────


def _multi_offer_html(html_name, offer_name, extra_offers, platform="flipkart"):
    """Build an HTML page with JSON-LD containing multiple variant offers."""
    base_html = (FIX / f"{html_name}_detail.html").read_text()
    # Replace the single-offer JSON-LD with a multi-offer one
    import json
    offers = [{"@type": "Offer", "name": offer_name, "price": "17999", "priceCurrency": "INR"}] + extra_offers
    ld = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Test Product",
        "offers": offers,
    }
    import re
    return re.sub(
        r'<script type="application/ld\+json">.*?</script>',
        f'<script type="application/ld+json">{json.dumps(ld)}</script>',
        base_html,
        flags=re.DOTALL,
    )


def test_flipkart_jsonld_variant_prices():
    """Flipkart JSON-LD with per-variant offer names yields priced variants."""
    extra = [
        {"@type": "Offer", "name": "12 GB / 256 GB", "price": "20999", "priceCurrency": "INR"},
    ]
    html = _multi_offer_html("flipkart", "8 GB / 128 GB", extra)
    d = FK._parse_flipkart_details(html)
    variants = {v["ram"] + "|" + v["storage"]: v["price"] for v in d["variants"]}
    assert variants.get("8 GB|128 GB") == 17999
    assert variants.get("12 GB|256 GB") == 20999


def test_amazon_jsonld_variant_prices():
    """Amazon JSON-LD with per-variant offer names yields priced variants."""
    extra = [
        {"@type": "Offer", "name": "12 GB / 256 GB", "price": "24999", "priceCurrency": "INR"},
    ]
    html = _multi_offer_html("amazon", "8 GB / 128 GB", extra)
    d = AMZ._parse_amazon_details(html)
    variants = {v["ram"] + "|" + v["storage"]: v["price"] for v in d["variants"]}
    # _multi_offer_html hardcodes the first offer price as 17999
    assert variants.get("8 GB|128 GB") == 17999
    assert variants.get("12 GB|256 GB") == 24999


def test_jsonld_variant_offer_with_itemoffered():
    """JSON-LD itemOffered with nested Product name yields priced variants."""
    html = """<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Test Phone",
  "offers": [
    {
      "@type": "Offer",
      "price": "15999",
      "itemOffered": {"@type": "Product", "name": "6 GB / 64 GB"}
    },
    {
      "@type": "Offer",
      "price": "17999",
      "itemOffered": {"@type": "Product", "name": "8 GB / 128 GB"}
    }
  ]
}
</script></head><body></body></html>"""
    soup = BeautifulSoup(html, "lxml")
    variants = FK._extract_variants_from_jsonld(soup)
    vmap = {v["ram"] + "|" + v["storage"]: v["price"] for v in variants}
    assert vmap.get("6 GB|64 GB") == 15999
    assert vmap.get("8 GB|128 GB") == 17999


def test_jsonld_variant_without_price_falls_back_to_text():    
    """Variants found by text-pattern but missing in JSON-LD keep price=None."""
    html = """<html><body>
    <div class="variant">8 GB / 128 GB</div>
    <div class="variant">12 GB / 256 GB</div>
</body></html>"""
    d = FK._parse_flipkart_details(html)
    for v in d["variants"]:
        assert v["price"] is None
    assert len(d["variants"]) == 2


def test_jsonld_variant_single_offer_skipped_gracefully():
    """A single JSON-LD offer (no variant name) does not break extraction."""
    html = """<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Test Phone",
  "offers": {"@type": "Offer", "price": "15999", "priceCurrency": "INR"}
}
</script></head><body>
<div class="variant">8 GB / 128 GB</div>
</body></html>"""
    d = FK._parse_flipkart_details(html)
    assert len(d["variants"]) == 1
    assert d["variants"][0]["price"] is None  # text-pattern variant, no JSON-LD match
