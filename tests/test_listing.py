import automation.listing as L
from pathlib import Path

FIX = Path(__file__).parent / "fixtures"


def test_parse_flipkart_extracts_names_urls():
    html = (FIX / "flipkart_listing.html").read_text()
    items = L._parse_flipkart(html)
    assert len(items) == 3
    names = [n for n, _ in items]
    assert any("Motorola G85" in n for n in names)
    urls = [u for _, u in items]
    assert all(u.startswith("https://www.flipkart.com/") for u in urls)
    assert all("pid=" in u for u in urls)


def test_parse_amazon_extracts_names_urls():
    html = (FIX / "amazon_listing.html").read_text()
    items = L._parse_amazon(html)
    assert len(items) == 3
    urls = [u for _, u in items]
    assert all("/dp/" in u for u in urls)
    assert any("iQOO Neo 9 Pro" in n for n, _ in items)


def test_get_brand_listings_uses_flipkart_source(monkeypatch):
    monkeypatch.setattr(L, "_fetch", lambda u: (FIX / "flipkart_listing.html").read_text())
    items = L.get_brand_listings("Motorola", "flipkart")
    assert len(items) == 3
    assert items[0][1].startswith("https://www.flipkart.com/")


def test_get_brand_listings_uses_amazon_source(monkeypatch):
    monkeypatch.setattr(L, "_fetch", lambda u: (FIX / "amazon_listing.html").read_text())
    items = L.get_brand_listings("iQOO", "amazon")
    assert len(items) == 3
    assert items[0][1].startswith("https://www.amazon.in/")
