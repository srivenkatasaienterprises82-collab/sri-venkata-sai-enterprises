import automation.flipkart as FK
import automation.amazon as AMZ
from pathlib import Path

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
