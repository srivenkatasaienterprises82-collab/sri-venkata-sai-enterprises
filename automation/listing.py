import re
import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

FLIPKART_SEARCH = "https://www.flipkart.com/search?q={brand}"
AMAZON_SEARCH = "https://www.amazon.in/s?k={brand}"


def get_brand_listings(brand: str, source: str) -> list:
    """Return a list of (name, url) tuples for products of `brand` on the source site."""
    if source == "flipkart":
        html = _fetch(FLIPKART_SEARCH.format(brand=requests.utils.quote(brand)))
        return _parse_flipkart(html)
    html = _fetch(AMAZON_SEARCH.format(brand=requests.utils.quote(brand)))
    return _parse_amazon(html)


def _fetch(url: str) -> str:
    res = requests.get(url, headers=HEADERS, timeout=30)
    res.raise_for_status()
    return res.text


def _parse_flipkart(html: str) -> list:
    out = []
    pattern = re.compile(
        r'<a\b[^>]+href="(/[^"]*(?:/p/|/product/|pid=)[^"]*)"[^>]*>(.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    for m in pattern.finditer(html):
        href = m.group(1)
        name = _clean_text(m.group(2))
        if len(name) >= 4:
            full = href if href.startswith("http") else "https://www.flipkart.com" + href
            out.append((name, full))
    return _dedupe(out)


def _parse_amazon(html: str) -> list:
    out = []
    pattern = re.compile(
        r'<a\b[^>]+href="(/[^"]*(?:/dp/|/gp/product/)[^"]*)"[^>]*>(.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    for m in pattern.finditer(html):
        href = m.group(1)
        name = _clean_text(m.group(2))
        if len(name) >= 4:
            full = href if href.startswith("http") else "https://www.amazon.in" + href
            out.append((name, full))
    return _dedupe(out)


def _clean_text(html_fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html_fragment)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _dedupe(items: list) -> list:
    seen = set()
    result = []
    for name, url in items:
        if url in seen:
            continue
        seen.add(url)
        result.append((name, url))
    return result
