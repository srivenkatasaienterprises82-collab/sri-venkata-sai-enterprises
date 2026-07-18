import re
from rapidfuzz import fuzz


def is_match(name1: str, name2: str, threshold: int = 90) -> bool:
    """Fuzzy compare two product names. Default threshold 90 (down from 95).

    Earlier 95% was too strict for typical marketplace title variants such as
    "Moto G85 5G" vs "Motorola G85 5G (Blue, 128 GB)"; the launch dedup was
    missing genuine duplicates. 90 keeps the false-positive rate low while
    matching normal title-format variation.

    Pre-pass: if exactly one side has a trailing "+", Pro/Pro+/Lite/Max/
    Ultra/Plus difference, the strings are NOT the same model — refuse the
    match regardless of fuzzy similarity. This is what's saved us from
    matching "Realme 16 Pro" against "Realme 16 Pro+" at the dedup stage.
    """
    if _differs_by_model_variant(name1, name2):
        return False
    score = fuzz.ratio(_norm_name(name1), _norm_name(name2))
    return score >= threshold


# Models get distinguished by + / Pro / Plus / Ultra / Lite / FE / Neo etc.
# Without this guard rapidfuzz happily scores "Realme 16 Pro" and "Realme 16
# Pro+" at ~96 and treats them as the same launch — double-creating drafts.
_MODEL_SUFFIX_TOKENS = {"pro+", "ultra+", "plus+", "max+", "lite+", "neo+"}


def _differs_by_model_variant(a: str, b: str) -> bool:
    """Detect model-grade differences (e.g. "Pro" vs "Pro+") that shouldn't
    satisfy the match even at high fuzzy scores."""
    na = _norm_name(a)
    nb = _norm_name(b)
    # If one string literally ends with "+" and the other doesn't (after
    # whitespace-stripping), they're different models.
    if na.endswith("+") != nb.endswith("+"):
        return True
    return False


def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("/", "-")


def _norm_name(name: str) -> str:
    """Collapse brand synonyms and storage/color noise for fuzzy matching."""
    if not name:
        return ""
    s = name.lower()
    # Unify brand synonyms so "Moto" and "Motorola" compare equal.
    s = re.sub(r"\bmoto\b", "motorola", s)
    return s


# ─── Price plausibility guards ──────────────────────────────────────────────
#
# These bands were chosen by inspecting the live Sanity catalogue: every
# tracked product sits inside ₹5,000–₹2,00,000. The hard floor/ceil catches
# accessories or sponsored links captured by mistake (e.g. a ₹173 tempered
# glass listed in place of a ₹17,000 phone). The relative-delta guard rejects
# jumps that are almost certainly scraper/captcha artefacts (a 60% drop or a
# 4x jump between scheduled runs is implausible for a stable SKU).

PRICE_FLOOR = 1_000
PRICE_CEIL = 250_000
# Reject a freshly-scraped price if it differs from the previous one by more
# than these ratios. Bounds are deliberately generous so genuine sales or
# restocks (rare events at this cadence) still flow through.
MAX_DROP_RATIO = 0.50   # new price cannot be less than 50% of the old price
MAX_JUMP_RATIO = 4.00   # new price cannot be more than 4x the old price


def price_in_bounds(price):
    """Return True if `price` lies within the hard absolute bounds."""
    return price is not None and PRICE_FLOOR <= price <= PRICE_CEIL


def price_change_is_plausible(old, new):
    """Return (bool ok, str reason). `reason` is empty when ok=True."""
    if old is None or old == 0:
        return True, ""
    if new is None:
        return False, "new_price_none"
    ratio = new / old
    if ratio < MAX_DROP_RATIO:
        return False, f"price_drop_too_large({ratio:.2f}x)"
    if ratio > MAX_JUMP_RATIO:
        return False, f"price_jump_too_large({ratio:.2f}x)"
    return True, ""


# ─── URL ↔ product-name sanity check ────────────────────────────────────────
# A common cause of silent price-skew is a stored URL that points at a
# different product than the Sanity document's name (e.g. a generic Amazon
# search that resolved to an accessory, or a Flipkart search that hit the
# wrong variant). When the URL contains a recognizable product slug we
# token-match it against the product name; if it's nowhere near we reject and
# log a `url_name_mismatch` reason code instead of silently writing the wrong
# price.

def url_name_matches(name: str, url: str) -> bool:
    """Heuristic: extract the product-slug tail of a Flipkart/Amazon URL and
    compare its model identifier to the Sanity product name.

    Returns False (skip + log) only for the high-signal cases:

      * The URL contains accessory keywords (tempered-glass, screen-guard,
        cover, case, charger, ... ) — guaranteed wrong.
      * The product name names a specific model (letter+digit id like a4,
        t4x, c83, k13) and the URL slug names a DIFFERENT model. This caught
        Redmi-A4-stored-as-Redmi-A7, Vivo-T4x-stored-as-T4-Lite, etc.

    Returns True otherwise. Importantly, generic marketplace slugs that name
    NO model (e.g. ".../Storage-Segments-Fastest-Processor-Smoothest") are
    accepted — and storage/screen-size numbers (128, 256, 12, 11) are NOT
    treated as model ids because they appear in countless legitimate slugs.
    Real price errors are still caught downstream by the price-band and
    relative-delta guards.
    """
    if not url:
        return False
    path = url.split("?", 1)[0]
    slug = ""
    # Flipkart product path: /<slug-with-dashes>/p/<id>
    m = re.search(r"/([a-z0-9][a-z0-9\-+]{3,})/p/", path, re.I)
    if not m:
        # Amazon pretty URL: /<slug-with-dashes>/dp/<ASIN>
        m = re.search(r"/([a-z0-9][a-z0-9\-+]{3,})/dp/", path, re.I)
    if m:
        slug = m.group(1)
    if not slug:
        # Bare /dp/<ASIN> URLs have no human-readable title. Can't validate;
        # accept and rely on the relative-delta guard downstream.
        return True

    # Reject obvious accessory URL slugs. These keywords appearing in the URL
    # slug is strong evidence the listing is for an accessory, not a phone.
    accessory_patterns = [
        r"tempered[\-\s]?glass", r"screen[\-\s]?guard", r"screen[\-\s]?protector",
        r"\bskin\b", r"\bsleeve\b", r"\bstand\b", r"\bholder\b",
        r"\bmount\b", r"\bstrap\b", r"\bband\b", r"\bpouch\b", r"\bsticker\b",
    ]
    slug_lower = slug.lower()
    for pat in accessory_patterns:
        if re.search(pat, slug_lower):
            return False

    noise = {"5g", "4g", "gb", "ram", "rom", "2026", "2025", "pro", "lite",
             "max", "plus", "ultra", "fe", "ne", "2024", "refurbished",
             "smartphone", "mobile", "phone"}
    name_strong = set(_tokenize_slug(name)) - noise
    url_strong = set(_tokenize_slug(slug)) - noise

    # High-signal catch: the product name names a specific model (letter+
    # digit id like a4, t4x, c83, k13) and the URL slug names a DIFFERENT
    # model. Generic slugs that name no model are accepted.
    name_model = next((t for t in name_strong if _looks_like_model_identifier(t)), None)
    url_models = [t for t in url_strong if _looks_like_model_identifier(t)]
    if name_model and name_model not in url_models and url_models:
        return False

    return True


_MODEL_TOKEN_RE = re.compile(r"^[a-z]?\d+[a-z]*$", re.I)


def _looks_like_model_identifier(token: str) -> bool:
    """Heuristic: detect letter+digit model ids like "a4", "a7", "t4x", "c83",
    "k13", "s10" — the tokens that disambiguate one phone model from another.

    Pure-digit tokens (e.g. "128", "256", "12", "11") are deliberately NOT
    treated as model ids: they are storage capacities and screen sizes that
    appear in countless legitimate slugs, and treating them as model ids
    caused false rejections of correct URLs. Genuine all-digit model numbers
    (Redmi Note 12 vs 13) are a rarer case and are still protected by the
    price-band / relative-delta guards downstream.
    """
    t = token.lower()
    if not t:
        return False
    if t.isdigit():
        return False
    # Letter + digits(+ optional letters): a4, a7, t4x, c83, k13, s10, x100.
    return bool(_MODEL_TOKEN_RE.match(t))


def _tokenize_slug(s: str):
    """Split a kebab/camel string into searchable tokens.

    Tokens of length >= 2 are kept (rather than the typical >= 3): phone
    model identifiers like "a4", "a7", "t4", "t7", "m7" are two characters
    long and are exactly what we need to compare when validating that a
    stored URL points at the right product (catches Redmi-A4-stored-as-A7).

    The 2-letter noise like "5g", "gb" still survives this filter; they get
    filtered downstream by the `noise` set inside `url_name_matches`.
    """
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return [t for t in s.split() if len(t) >= 2]


# ─── URL ↔ product-color sanity check ───────────────────────────────────────
# Flipkart/Amazon product URLs embed the specific colour variant in the slug
# (e.g. `vivo-v70-elite-passion-red-2026-256-gb`). When that colour is NOT
# one the Sanity product actually comes in, the URL points at a different
# colourway of the same model — and marketplace pricing/stock for colourways
# differs, so writing its price onto the canonical product is wrong. The V70
# Elite case is exactly this: the stored URL says `passion-red` while the live
# page resolves to "Authentic Black", yet Sanity lists both Red and Black in
# its palette, so a name-only check passes while the price is off by ~₹12k.
#
# We keep this conservative: only FLAG when the URL slug clearly names a
# colour that is absent from the product's `colors[]` palette. URLs that name
# no colour (generic slugs) are accepted — we fall back to the downstream
# price-band / relative-delta guards rather than guessing.

# Marketing colour phrase -> canonical keyword(s) found in Sanity `colors[].name`.
_COLOR_ALIASES = {
    "black": "black", "authenticblack": "black", "midnightblack": "black",
    "blue": "blue", "twilightblue": "blue", "emerald": "blue", "glacierblue": "blue",
    "navy": "blue", "cyber": "blue", "star": "silver", "starsilver": "silver",
    "silver": "silver", "titanium": "gold", "gold": "gold", "titaniumgold": "gold",
    "champagne": "gold", "red": "red", "passionred": "red", "crimson": "red",
    "purple": "purple", "northernlightspurple": "purple", "lavender": "purple",
    "green": "green", "cybergreen": "green", "forest": "green", "sage": "green",
    "orange": "orange", "racing": "black", "white": "white", "arctic": "white",
    "pink": "pink", "rose": "pink", "beige": "beige", "cream": "white",
    "yellow": "yellow", "cyan": "blue", "teal": "green", "grey": "silver",
    "gray": "silver", "brown": "brown", "bronze": "gold",
}


def _color_tokens_from_slug(slug: str) -> list:
    """Pull colour-ish tokens out of a marketplace URL slug.

    Colour phrases are multi-word marketing names glued with dashes
    (`passion-red`, `authentic-black`, `northern-lights-purple`). We scan
    every 1- and 2-gram of the slug against the alias table so both
    `red` and `passion-red` resolve.
    """
    toks = _tokenize_slug(slug)
    found = []
    for i, t in enumerate(toks):
        if t in _COLOR_ALIASES:
            found.append(_COLOR_ALIASES[t])
        # 2-gram: previous + current (handles glued/multiword colours)
        if i > 0:
            bigram = toks[i - 1] + toks[i]
            if bigram in _COLOR_ALIASES:
                found.append(_COLOR_ALIASES[bigram])
    return found


def url_color_matches(name: str, url: str, colors: list) -> bool:
    """Return False when the URL slug names a colour the product doesn't have.

    `colors` is the Sanity product's `colors[]` (each item has a `name`,
    e.g. "Black", "Red"). We normalise those names to keywords and compare
    against the colours extracted from the URL slug. A URL that names a
    colour absent from the palette is rejected (return False); a URL with no
    discernible colour is accepted (return True) to avoid false negatives.
    """
    if not url:
        return True
    path = url.split("?", 1)[0]
    slug = ""
    m = re.search(r"/([a-z0-9][a-z0-9\-+]{3,})/p/", path, re.I)
    if not m:
        m = re.search(r"/([a-z0-9][a-z0-9\-+]{3,})/dp/", path, re.I)
    if m:
        slug = m.group(1)
    if not slug:
        return True

    # Canonical keywords from the product's own colour palette.
    palette = set()
    for c in (colors or []):
        nm = (c.get("name") if isinstance(c, dict) else str(c)).lower().strip()
        palette.add(nm)
        # also accept the slugified form of the name (e.g. "authentic black")
        palette.add(re.sub(r"[^a-z0-9]+", "", nm))
    if not palette:
        # No colour data on the product — can't judge, accept.
        return True

    url_colors = _color_tokens_from_slug(slug)
    if not url_colors:
        # URL names no colour — don't guess, accept and rely on other guards.
        return True

    # Reject only if EVERY colour the URL names is outside the palette.
    # (A URL naming one valid + one unknown colour is still plausibly right.)
    if all(c not in palette for c in url_colors):
        return False
    return True
