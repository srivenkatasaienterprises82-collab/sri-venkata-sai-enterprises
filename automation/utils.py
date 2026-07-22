import os
import re
from rapidfuzz import fuzz

# ---------------------------------------------------------------------------
# Tuning knobs
# ---------------------------------------------------------------------------
# Per-variant price-delta cap for a single sync run (20% max change per step).
MAX_VARIANT_DELTA = 0.20
# Minimum identity confidence required by the new sync.py (Flipkart-only).
SYNC_MIN_IDENTITY_CONFIDENCE = 0.92
# Legacy threshold kept for launch-checker and other callers.
LEGACY_MIN_IDENTITY_CONFIDENCE = 0.75

# ---------------------------------------------------------------------------
# Groq AI helper (optional)
# ---------------------------------------------------------------------------
_groq_client = None


def _get_groq_client():
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from groq import Groq
        _groq_client = Groq(api_key=api_key)
        return _groq_client
    except Exception:
        return None


def groq_normalize(name: str, brand: str) -> dict:
    """Use Groq to produce canonical title + slug. Falls back to identity."""
    client = _get_groq_client()
    if not client:
        return {"title": name, "slug": name.lower().replace(" ", "-"), "description": ""}
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Output strictly valid JSON. No markdown."},
                {
                    "role": "user",
                    "content": (
                        f"Normalize this product name to a clean official title and URL slug.\n"
                        f"Raw name: '{name}'\nBrand: {brand}\n"
                        'Return JSON: {"title": "...", "slug": "..."}'
                    ),
                },
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        data = json.loads(completion.choices[0].message.content)
        return {
            "title": data.get("title", name),
            "slug": data.get("slug", name.lower().replace(" ", "-")),
            "description": "",
        }
    except Exception:
        return {"title": name, "slug": name.lower().replace(" ", "-"), "description": ""}


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


def variant_price_change_is_plausible(old_price, new_price):
    """Return (bool, reason). Per-variant delta guard for exact-matched variants.

    Uses a tighter band (MAX_VARIANT_DELTA = 20%) than the product-level
    guard, because a per-variant price shouldn't swing wildly within one sync.
    """
    if old_price is None or old_price == 0:
        return True, ""
    if new_price is None:
        return False, "new_price_none"
    ratio = new_price / old_price
    if ratio < (1.0 - MAX_VARIANT_DELTA):
        return False, f"variant_drop_too_large({ratio:.2f}x)"
    if ratio > (1.0 + MAX_VARIANT_DELTA):
        return False, f"variant_jump_too_large({ratio:.2f}x)"
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


# ─── Marketplace cross-check (item 14) ──────────────────────────────────────
# When BOTH Flipkart and Amazon prices are scraped for the same product, they
# should agree within a tolerance. A ₹24999 vs ₹4999 split means one of the
# two scrapes is a bot-check/interstitial artefact (a stray price widget), and
# writing either would be wrong. Reject when the gap is implausibly wide.
MAX_MARKET_GAP = 0.30  # >30% difference between the two marketplaces is suspect


def marketplaces_agree(flipkart_price, amazon_price, gap: float = MAX_MARKET_GAP):
    """Return (ok, reason). Only meaningful when BOTH prices are present."""
    if flipkart_price is None or amazon_price is None:
        return True, ""  # nothing to cross-check; rely on other guards
    lo, hi = min(flipkart_price, amazon_price), max(flipkart_price, amazon_price)
    if lo <= 0:
        return True, ""
    diff = (hi - lo) / lo
    if diff > gap:
        return False, f"market_gap_too_wide(fk={flipkart_price},az={amazon_price},{diff:.0%})"
    return True, ""


# ─── Variant self-consistency (item 15) ─────────────────────────────────────
# Within a single marketplace's variant list, more storage (same RAM) must not
# be CHEAPER than less storage, and more RAM (same storage) must not be cheaper.
# A scrape that yields "8/256 = ₹22999 but 8/128 = ₹24999" is internally
# impossible and signals a mis-aligned / wrong-page extraction.
VARIANT_TOL = 0.05  # allow tiny 5% noise for offers; beyond that reject


def variants_self_consistent(variants: list, tol: float = VARIANT_TOL):
    """Return (ok, reason). Checks monotonic pricing within RAM/Storage groups."""
    if not variants or len(variants) < 2:
        return True, ""
    def _ns(v) -> str:
        if not v:
            return ""
        s = str(v).lower().strip()
        s = s.replace(" ", "").replace("gb", "").replace("ram", "").replace("rom", "")
        return s
    norm = lambda v: (_ns(v.get("ram")), _ns(v.get("storage")), v.get("price"))
    rows = [norm(v) for v in variants]
    rows = [r for r in rows if isinstance(r[2], (int, float)) and r[2] > 0]
    if len(rows) < 2:
        return True, ""

    # Sort helper: order tokens numerically when they're pure digits, else
    # lexicographically (RAM/storage normalise to e.g. "8","12","128","256").
    def _key(t: str):
        return (0, int(t)) if t.isdigit() else (1, t)

    # Group by RAM: within a RAM group, higher storage should cost >= lower.
    by_ram: dict = {}
    for ram, storage, price in rows:
        by_ram.setdefault(ram, []).append((storage, price))
    for ram, group in by_ram.items():
        group_sorted = sorted((g for g in group if g[0]), key=lambda g: _key(g[0]))
        for (s1, p1), (s2, p2) in zip(group_sorted, group_sorted[1:]):
            if s1 and s2 and s1 != s2 and p2 < p1 * (1 - tol):
                return False, f"variant_storage_inverted(ram={ram},{s1}={p1},{s2}={p2})"

    # Group by storage: within a storage group, higher RAM should cost >= lower.
    by_storage: dict = {}
    for ram, storage, price in rows:
        by_storage.setdefault(storage, []).append((ram, price))
    for storage, group in by_storage.items():
        group_sorted = sorted((g for g in group if g[0]), key=lambda g: _key(g[0]))
        for (r1, p1), (r2, p2) in zip(group_sorted, group_sorted[1:]):
            if r1 and r2 and r1 != r2 and p2 < p1 * (1 - tol):
                return False, f"variant_ram_inverted(storage={storage},{r1}={p1},{r2}={p2})"
    return True, ""


# Brand slug -> alias tokens that appear in marketplace URL slugs. Lets the
# identity check recognise "motorola" products hosted at "moto-..." URLs.
_BRAND_ALIASES = {
    "motorola": {"motorola", "moto"},
    "amazon": {"amazon"},
    "flipkart": {"flipkart"},
}


def _brand_in_url(brand_slug: str, url: str) -> bool:
    """True if any brand token (slug or aliases) appears in the URL slug/path."""
    if not brand_slug or not url:
        return False
    candidates = _BRAND_ALIASES.get(brand_slug.lower(), {brand_slug.lower()})
    url_lower = url.lower()
    return any(c in url_lower for c in candidates)


# ─── Product-identity confidence (item 16) ──────────────────────────────────
# Before trusting a scrape, score how confidently the stored product identity
# matches the listing we actually fetched. Factors: brand slug present in URL,
# model token match, colour match, and (if a product name is supplied) name
# similarity. Returns (score 0..1, detail dict). The orchestrator may require a
# minimum score before writing (guard against wrong-product writes).
def identity_confidence(product: dict, url: str) -> "tuple[float, dict]":
    """Score 0..1 that `url` really is the product in `product`.

    Factors (each 0/1, averaged):
      * brand slug appears in the URL host/path
      * model identifier from the product name appears in the URL slug
      * URL colour (if any) is in the product's colour palette
      * product name fuzzy-matches the URL slug
    """
    detail = {}
    name = product.get("name", "") or ""
    brand_slug = (product.get("brandSlug") or "").lower()
    colors = product.get("colors") or []

    # 1) brand. Match the brand slug OR any of its common aliases against the
    # URL (e.g. "motorola" products live at "moto-..." slugs). Host-only
    # marketplaces (flipkart.com / amazon.in) carry no brand, so we only check
    # the slug path, never penalise for the bare host.
    brand_ok = bool(brand_slug) and _brand_in_url(brand_slug, url or "")
    detail["brand"] = brand_ok

    # 2) model token in URL slug
    model_ok = url_name_matches(name, url or "")
    detail["model"] = model_ok

    # 3) colour
    color_ok = url_color_matches(name, url or "", colors)
    detail["color"] = color_ok

    # 4) name similarity to slug
    from rapidfuzz import fuzz
    slug = ""
    if url:
        m = re.search(r"/([a-z0-9][a-z0-9\-+]{3,})/(?:p|dp)/", url.split("?")[0], re.I)
        if m:
            slug = m.group(1)
    name_sim = fuzz.ratio(_norm_name(name), slug.replace("-", " ")) / 100.0 if slug else 0.0
    detail["name_sim"] = round(name_sim, 2)

    factors = [1.0 if brand_ok else 0.0, 1.0 if model_ok else 0.0,
               1.0 if color_ok else 0.0, name_sim]
    score = sum(factors) / len(factors)
    return score, detail
