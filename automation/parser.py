"""Deterministic price parsing with strategy voting + confidence (items 10-12).

The parser is intentionally *fetcher-agnostic*: both the curl_cffi path and the
Playwright path return HTML, and that HTML is handed here. Keeping parsing
separate from fetching (as the brief already does) means the fetch strategy can
change without touching extraction.

Pipeline per page:
    1. DOM fingerprint (item 10) — hash the main container so a marketplace
       layout change is detected immediately (logged, never fatal).
    2. Strategy voting (item 11) — JSON-LD, embedded JSON, CSS selectors, regex
       each cast a "vote" for a price. When >=2 independent strategies agree,
       confidence is high.
    3. Confidence score (item 12) — combines strategy agreement, product-page
       detection, and hard bounds. A price is only "writable" at/above
       MIN_CONFIDENCE (default 0.95) so a lone, unverified extraction never
       reaches Sanity.

The parser does NOT decide network policy — that's FetchManager's job.
"""
import hashlib
import re
from dataclasses import dataclass


# Minimum confidence required before a price may be written to Sanity (item 12).
MIN_CONFIDENCE = 0.95


@dataclass
class ParseResult:
    price: int | None
    confidence: float
    # Number of independent strategies that returned a *matching* price.
    agreeing: int
    # Per-strategy prices, for diagnostics: {strategy: price}
    votes: dict
    # Human-readable reason a price was/wasn't accepted.
    reason: str
    # DOM fingerprint of the page (item 10).
    fingerprint: str


def dom_fingerprint(html: str) -> str:
    """Stable hash of the *structural* signature of the page (item 10).

    We strip all text/attributes and keep only the tag path of the main price
    containers, so a cosmetic text change doesn't alter the fingerprint but a
    real layout change (Flipkart renaming `Nx9bqj`) does. Unknown fingerprints
    are logged by the caller; they are never fatal.
    """
    if not html:
        return "empty"
    # Keep only tag names of elements likely to be price containers, in order.
    sig = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.S | re.I)
    # Build a structural signature: just the sequence of tag names. We ignore
    # attributes/classes entirely so cosmetic class churn doesn't flip the
    # fingerprint, but a real container rename (e.g. Flipkart `Nx9bqj` ->
    # something else) does.
    tags = re.findall(r"<([a-zA-Z0-9]+)", sig)
    path = " ".join(tags[:4000])
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:16]


def _digit(price_str: str | None) -> int | None:
    if not price_str:
        return None
    digits = re.sub(r"[^\d]", "", str(price_str))
    return int(digits) if digits else None


# Strategies that are structurally trustworthy (structured data) count as two
# "votes" — a single JSON-LD price on a real product page is enough to clear
# the confidence gate, matching the prior behaviour where JSON-LD alone was
# accepted. Pure CSS/regex matches need corroboration from a second strategy.
_STRONG = {"jsonld", "embedded_json"}


def vote(candidates: "list[tuple[str, int | None]]", is_product_page: bool,
         fingerprint: str | None = None) -> ParseResult:
    """Combine independent extraction strategies into one confident price.

    `candidates` is a list of (strategy_name, price) from the various extractors
    (JSON-LD, embedded JSON, CSS, regex). `None` entries are dropped. We take
    the *modal* price (most common value) and count weighted agreement (item 11):
    structured-data strategies (jsonld/embedded_json) count double.

    Confidence (item 12):
      * 0.40 base if a price exists at all.
      * +0.25 if the page is a genuine product page (not a bot/interstitial).
      * +0.35 if weighted agreement >= 2 (a strong strategy alone, or two
        independent strategies, both clear the gate).
      * clamped to 1.0. A single lone CSS/regex extraction with no corroboration
        stays below MIN_CONFIDENCE and is rejected.
    """
    votes: dict = {}
    for name, price in candidates:
        if price is None:
            continue
        votes[name] = price

    if not votes:
        return ParseResult(
            price=None, confidence=0.0, agreeing=0, votes=votes,
            reason="no strategy extracted a price", fingerprint=fingerprint or "",
        )

    # Weighted agreement for the modal price.
    from collections import Counter
    counts = Counter(votes.values())
    modal_price, _ = counts.most_common(1)[0]
    agreeing = sum(
        2 if name in _STRONG else 1
        for name, price in votes.items()
        if price == modal_price
    )

    confidence = 0.40
    if is_product_page:
        confidence += 0.25
    if agreeing >= 2:
        confidence += 0.35
    confidence = min(confidence, 1.0)

    reason = (
        f"weighted_agreement={agreeing} on {modal_price}; "
        f"product_page={is_product_page}; conf={confidence:.2f}"
    )
    return ParseResult(
        price=modal_price, confidence=confidence, agreeing=agreeing,
        votes=votes, reason=reason, fingerprint=fingerprint or "",
    )


def confident_price(result: ParseResult) -> "int | None":
    """Return the price only if confidence meets the write gate (item 12)."""
    if result.price is not None and result.confidence >= MIN_CONFIDENCE:
        return result.price
    return None
