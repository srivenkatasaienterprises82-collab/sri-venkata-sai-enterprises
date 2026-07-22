import datetime
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUTOMATION = os.path.join(ROOT, "automation")
for path in (ROOT, AUTOMATION):
    if path not in sys.path:
        sys.path.insert(0, path)

import automation.sync as SYNC  # noqa: E402
from automation.utils import variant_price_change_is_plausible  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _product(**overrides):
    base = {
        "_id": "p-test-001",
        "name": "Vivo T4 5G",
        "slug": {"current": "vivo-t4"},
        "brand": {"name": "Vivo"},
        "brandSlug": "vivo",
        "flipkartUrl": "https://www.flipkart.com/vivo-t4-5g-emerald-blaze-256-gb/p/itm_x",
        "price": 27999,
        "priceLocked": False,
        "enabled": True,
        "variants": [
            {"ram": "8GB", "storage": "128GB", "price": 26999},
            {"ram": "8GB", "storage": "256GB", "price": 27999},
            {"ram": "12GB", "storage": "256GB", "price": 29999},
        ],
        "lastPriceUpdatedAt": (
            datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=25)
        ).isoformat(),
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# sync_one guard tests
# ---------------------------------------------------------------------------

def test_skip_draft_disabled(monkeypatch):
    calls = []
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: pytest.fail("should not scrape"))
    p = _product(enabled=False)
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert r["reason"] == "draft_disabled"


def test_skip_price_locked(monkeypatch):
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: pytest.fail("should not scrape"))
    p = _product(priceLocked=True)
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert r["reason"] == "price_locked"


def test_skip_not_flipkart_routed(monkeypatch):
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: pytest.fail("should not scrape"))
    p = _product(brandSlug="nokia")
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert "not_flipkart" in r["reason"]


def test_skip_no_url(monkeypatch):
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: pytest.fail("should not scrape"))
    p = _product(flipkartUrl="")
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert r["reason"] == "no_url"


def test_skip_fresh(monkeypatch):
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: pytest.fail("should not scrape"))
    monkeypatch.setattr("automation.urls.run_sync", lambda p: ("ok", "", p.get("flipkartUrl", "")))
    p = _product(
        lastPriceUpdatedAt=(
            datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)
        ).isoformat()
    )
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert r["reason"] == "fresh"


# ---------------------------------------------------------------------------
# exact-match write path
# ---------------------------------------------------------------------------

class _FakeFK:
    variants = [
        {"ram": "8GB", "storage": "128GB", "price": 25999, "flipkartPrice": 25999},
        {"ram": "8GB", "storage": "256GB", "price": 26999, "flipkartPrice": 26999},
        {"ram": "12GB", "storage": "256GB", "price": 28999, "flipkartPrice": 28999},
    ]
    fingerprint = "fp123"
    extractors_used = ["react_props"]
    elapsed_ms = 100.0


def test_exact_match_writes_price(monkeypatch):
    SYNC.DRY_RUN = False
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: _FakeFK())
    monkeypatch.setattr("automation.urls.run_sync", lambda p: ("ok", "", p.get("flipkartUrl", "")))
    written = []
    monkeypatch.setattr(SYNC, "update_variants_and_price", lambda **kw: written.append(kw) or {"results": [{}]})
    monkeypatch.setattr(SYNC, "record_freshness", lambda *a, **k: None)
    monkeypatch.setattr(SYNC, "record_price", lambda *a, **k: None)
    monkeypatch.setattr(SYNC, "flag_manual_review", lambda *a, **k: None)

    p = _product()
    r = SYNC.sync_one(p)
    assert r["action"] == "update"
    assert r["new_price"] == 25999
    assert r["matched_count"] == 3


def test_no_match_skips_no_write(monkeypatch):
    SYNC.DRY_RUN = False
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: _FakeFK())
    monkeypatch.setattr("automation.urls.run_sync", lambda p: ("ok", "", p.get("flipkartUrl", "")))
    writes = []
    monkeypatch.setattr(SYNC, "update_variants_and_price", lambda **kw: writes.append(kw) or {"results": [{}]})
    monkeypatch.setattr(SYNC, "record_freshness", lambda *a, **k: None)
    monkeypatch.setattr(SYNC, "record_price", lambda *a, **k: None)
    monkeypatch.setattr(SYNC, "flag_manual_review", lambda *a, **k: None)

    p = _product(variants=[
        {"ram": "16GB", "storage": "512GB", "price": 49999},
    ])
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert r["reason"] == "no_exact_variant_match"
    assert writes == []


# ---------------------------------------------------------------------------
# per-variant delta guard
# ---------------------------------------------------------------------------

class _BigJumpFK:
    variants = [
        {"ram": "8GB", "storage": "128GB", "price": 44999, "flipkartPrice": 44999},
    ]
    fingerprint = "fp"
    extractors_used = ["jsonld"]
    elapsed_ms = 50.0


def test_per_variant_delta_rejects_oversized_jump(monkeypatch):
    SYNC.DRY_RUN = False
    monkeypatch.setattr(SYNC, "fk_extract", lambda url: _BigJumpFK())
    monkeypatch.setattr("automation.urls.run_sync", lambda p: ("ok", "", p.get("flipkartUrl", "")))
    writes = []
    monkeypatch.setattr(SYNC, "update_variants_and_price", lambda **kw: writes.append(kw) or {"results": [{}]})
    monkeypatch.setattr(SYNC, "record_freshness", lambda *a, **k: None)
    monkeypatch.setattr(SYNC, "record_price", lambda *a, **k: None)
    monkeypatch.setattr(SYNC, "flag_manual_review", lambda *a, **k: None)

    p = _product(variants=[
        {"ram": "8GB", "storage": "128GB", "price": 26999},
    ])
    r = SYNC.sync_one(p)
    assert r["action"] == "skip"
    assert "variant_implausible_delta" in r.get("reason", "")
    assert writes == []


# ---------------------------------------------------------------------------
# variant_price_change_is_plausible unit tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("old,new", [
    (100, 120),
    (27999, 29999),
    (19999, 19999),
])
def test_variant_delta_accepts_normal(old, new):
    ok, reason = variant_price_change_is_plausible(old, new)
    assert ok is True
    assert reason == ""


def test_variant_delta_rejects_35pct_jump():
    ok, reason = variant_price_change_is_plausible(27999, 37999)
    assert ok is False
    assert "variant_jump_too_large" in reason


def test_variant_delta_rejects_null_new():
    ok, reason = variant_price_change_is_plausible(27999, None)
    assert ok is False
    assert reason == "new_price_none"


def test_variant_delta_accepts_null_old():
    ok, reason = variant_price_change_is_plausible(None, 27999)
    assert ok is True
