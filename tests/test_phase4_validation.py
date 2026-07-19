import os
import tempfile

from automation import utils as U


# ─── Item 14: marketplace cross-check ───────────────────────────────────────
def test_marketplaces_agree_when_close():
    ok, why = U.marketplaces_agree(24999, 24899)
    assert ok is True
    assert why == ""


def test_marketplaces_reject_wide_gap():
    ok, why = U.marketplaces_agree(24999, 4999)
    assert ok is False
    assert "market_gap" in why


def test_marketplaces_agree_single_source_passes():
    # Not enough data to cross-check -> defer to other guards.
    assert U.marketplaces_agree(24999, None)[0] is True
    assert U.marketplaces_agree(None, 24999)[0] is True


# ─── Item 15: variant self-consistency ──────────────────────────────────────
def test_variants_consistent_normal():
    variants = [
        {"ram": "8GB", "storage": "128GB", "price": 24999},
        {"ram": "8GB", "storage": "256GB", "price": 26999},
    ]
    assert U.variants_self_consistent(variants)[0] is True


def test_variants_reject_storage_inversion():
    variants = [
        {"ram": "8GB", "storage": "128GB", "price": 26999},
        {"ram": "8GB", "storage": "256GB", "price": 24999},  # cheaper -> impossible
    ]
    ok, why = U.variants_self_consistent(variants)
    assert ok is False
    assert "variant_storage_inverted" in why


def test_variants_reject_ram_inversion():
    variants = [
        {"ram": "8GB", "storage": "128GB", "price": 26999},
        {"ram": "12GB", "storage": "128GB", "price": 24999},  # cheaper -> impossible
    ]
    ok, why = U.variants_self_consistent(variants)
    assert ok is False
    assert "variant_ram_inverted" in why


def test_variants_trivial_single_passes():
    assert U.variants_self_consistent([{"ram": "8GB", "storage": "128GB", "price": 24999}])[0] is True


# ─── Item 16: product-identity confidence ───────────────────────────────────
def test_identity_high_for_matching_url():
    product = {
        "name": "Redmi 13 5G", "brandSlug": "redmi",
        "colors": [{"name": "Black"}, {"name": "Blue"}],
    }
    url = "https://www.flipkart.com/redmi-13-5g-midnight-black-128-gb/p/itm123"
    score, detail = U.identity_confidence(product, url)
    assert score >= 0.75
    assert detail["brand"] is True
    assert detail["model"] is True


def test_identity_low_for_accessory_url():
    product = {
        "name": "Redmi 13 5G", "brandSlug": "redmi",
        "colors": [{"name": "Black"}],
    }
    # Accessory URL: not the product -> low confidence.
    url = "https://www.flipkart.com/redmi-13-tempered-glass/p/itm999"
    score, _ = U.identity_confidence(product, url)
    assert score < 0.75


# ─── Item 13: price history (separate module) ──────────────────────────────
def test_history_accepts_with_few_points(tmp_path, monkeypatch):
    from automation import price_history as PH
    monkeypatch.setattr(PH, "_HISTORY_PATH", str(tmp_path / "h.json"))
    # <3 points -> always consistent (defer to delta guard).
    PH.record_price("p1", 25000)
    PH.record_price("p1", 25000)
    assert PH.history_consistent(12000, "p1")[0] is True  # ignored, too few


def test_history_rejects_outlier(tmp_path, monkeypatch):
    from automation import price_history as PH
    monkeypatch.setattr(PH, "_HISTORY_PATH", str(tmp_path / "h.json"))
    for p in [25000, 25000, 24999, 25100, 24900, 25000]:
        PH.record_price("p2", p)
    # A sudden ₹12000 (half the median) is an outlier -> rejected.
    ok, why = PH.history_consistent(12000, "p2")
    assert ok is False
    assert "history_outlier" in why


def test_history_accepts_normal_change(tmp_path, monkeypatch):
    from automation import price_history as PH
    monkeypatch.setattr(PH, "_HISTORY_PATH", str(tmp_path / "h.json"))
    for p in [25000, 25000, 24999, 25100, 24900, 25000]:
        PH.record_price("p3", p)
    # A modest drop to ₹23999 is within 2x median -> accepted.
    assert PH.history_consistent(23999, "p3")[0] is True
