"""Unit tests for automation.utils — the price-validation guards and the
URL↔name matcher that underpin `launch_checker.sync_prices`.

These were added together with the `POCO`/`Poco` fix and the URL mismatch
guard so regressions to either behaviour are caught at PR time rather than
after a stale 6-hour price-sync run.
"""
import automation.utils as U


# ── is_match ────────────────────────────────────────────────────────────────

def test_is_match_identical_strings():
    assert U.is_match("Moto G85 5G", "Moto G85 5G")


def test_is_match_brand_synonym_normalisation():
    # `_norm_name` replaces "moto" with "motorola" so listings from
    # Flipkart ("Moto G85 5G") compare equal to Studio ("Motorola G85 5G").
    assert U.is_match("Moto G85 5G", "Motorola G85 5G")


def test_is_match_case_insensitive():
    assert U.is_match("POCO M7 Plus", "poco m7 plus")


def test_is_match_rejects_different_models():
    assert not U.is_match("Realme 16 Pro", "Realme 16 Pro+")


# ── price_in_bounds ─────────────────────────────────────────────────────────

def test_price_in_bounds_accepts_normal_range():
    assert U.price_in_bounds(14999)
    assert U.price_in_bounds(199999)


def test_price_in_bounds_rejects_accessory_price():
    # ₹173 was a tempered-glass screen protector that leaked in as the price
    # of a Realme phone. The lower bound is what would have caught it.
    assert not U.price_in_bounds(173)
    assert not U.price_in_bounds(999)


def test_price_in_bounds_rejects_extra_zero():
    assert not U.price_in_bounds(999999)
    assert not U.price_in_bounds(0)
    assert not U.price_in_bounds(-100)
    assert not U.price_in_bounds(None)


# ── price_change_is_plausible ───────────────────────────────────────────────

def test_price_change_accepts_smaller_movement():
    ok, reason = U.price_change_is_plausible(19999, 17999)
    assert ok and reason == ""


def test_price_change_rejects_large_drop():
    # A 60% drop in 6h is implausible. Reject and emit a reason code.
    ok, reason = U.price_change_is_plausible(29999, 11999)
    assert not ok
    assert "price_drop_too_large" in reason


def test_price_change_rejects_large_jump():
    ok, reason = U.price_change_is_plausible(14999, 79000)
    assert not ok
    assert "price_jump_too_large" in reason


def test_price_change_skip_when_no_old_price():
    # If Sanity had no prior price, anything sensible goes through.
    ok, reason = U.price_change_is_plausible(None, 18999)
    assert ok and reason == ""


# ── url_name_matches ────────────────────────────────────────────────────────

def test_url_name_matches_flipkart_match():
    url = "https://www.flipkart.com/vivo-v70-passion-red-256-gb/p/itm_xyz"
    assert U.url_name_matches("Vivo V70", url)


def test_url_name_matches_flipkart_mismatch():
    # Vivo T4 has a Flipkart URL that actually points at the Vivo T4 Lite
    # listing — the bug that motivated this guard.
    bad_url = "https://www.flipkart.com/vivo-t4-lite-5g-titanium-gold-2026-8gb-256gb/p/itm49fb53d099f3c"
    assert not U.url_name_matches("Vivo T4x", bad_url)


def test_url_name_matches_amazon_match():
    url = "https://www.amazon.in/Redmi-A4-Smartphone-Storage-Cyan/dp/B0GVJV0000"
    assert U.url_name_matches("Redmi A4", url)


def test_url_name_matches_amazon_mismatch():
    # "Redmi A4" had a stored URL that actually pointed at a Redmi A7 Pro.
    bad_url = "https://www.amazon.in/REDMI-A7-Pro-5G-Processor/dp/B0GS5M4VMH/"
    assert not U.url_name_matches("Redmi A4", bad_url)


def test_url_name_matches_accepts_unknown_slug_format():
    # Bare `/dp/<ASIN>` URLs (no human-readable title in path) can't be
    # check; return True so we still attempt the scrape rather than
    # falsely skipping everything.
    url = "https://www.amazon.in/dp/B0GVJV0000"
    assert U.url_name_matches("Redmi A4", url)


def test_url_name_matches_rejects_accessory_url():
    screen_guard = (
        "https://www.flipkart.com/valight-edge-tempered-glass-realme-c83-5g-5g"
        "/p/itm9405ab466427e"
    )
    assert not U.url_name_matches("Realme C83", screen_guard)


# ── url_color_matches ────────────────────────────────────────────────────────

def _colors(*names):
    return [{"name": n, "hex": "#000000"} for n in names]


def test_url_color_matches_passes_when_color_in_palette():
    # V70 Elite is listed in Red and Black; a "passion-red" URL is fine.
    url = "https://www.flipkart.com/vivo-v70-elite-passion-red-2026-256-gb/p/itm_x"
    assert U.url_color_matches("Vivo V70 Elite", url, _colors("Black", "Blue", "Red"))


def test_url_color_matches_flags_color_not_in_palette():
    # URL names "passion-red" but the product only comes in Black/Blue/Gold.
    url = "https://www.flipkart.com/vivo-v70-elite-passion-red-2026-256-gb/p/itm_x"
    assert not U.url_color_matches(
        "Vivo V70 Elite", url, _colors("Black", "Blue", "Gold")
    )


def test_url_color_matches_passes_when_url_names_no_color():
    # Generic slug with no colour word — can't judge, accept.
    url = "https://www.flipkart.com/vivo-v70-elite-2026-256-gb/p/itm_x"
    assert U.url_color_matches("Vivo V70 Elite", url, _colors("Black", "Red"))


def test_url_color_matches_passes_without_palette():
    # Product carries no colour data — don't guess, accept.
    url = "https://www.flipkart.com/vivo-v70-elite-passion-red-2026-256-gb/p/itm_x"
    assert U.url_color_matches("Vivo V70 Elite", url, [])


def test_url_color_matches_amazon_multiword_color():
    # "northern-lights-purple" -> purple; product has Purple.
    url = "https://www.amazon.in/vivo-v70-northern-lights-purple-256-gb/dp/B0X"
    assert U.url_color_matches("Vivo V70", url, _colors("Purple", "Black"))
