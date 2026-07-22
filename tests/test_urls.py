import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUTOMATION = os.path.join(ROOT, "automation")
for path in (ROOT, AUTOMATION):
    if path not in sys.path:
        sys.path.insert(0, path)

import pytest  # noqa: E402
from automation.urls import (  # noqa: E402
    Candidate,
    VerifyResult,
    FLIPKART_BRAND_SLUGS,
    MIN_URL_CONFIDENCE,
    _search_and_score,
    _best_above,
    verify_product,
    WRITE_DECISIONS,
)


def _product(name="Vivo T4 5G", brand_slug="vivo", flipkart_url="", colors=None, **_kw):
    return {
        "_id": "p-url-001",
        "name": name,
        "brandSlug": brand_slug,
        "flipkartUrl": flipkart_url,
        "colors": colors or [],
    }


# ---------------------------------------------------------------------------
# Brand routing
# ---------------------------------------------------------------------------

def test_skip_non_flipkart_brand():
    p = _product(brand_slug="nokia")
    r = verify_product(p)
    assert r.action == "skip"
    assert r.reason == "not_flipkart_routed"


def test_auto_find_url_when_missing(monkeypatch):
    """If no flipkartUrl and search yields high-confidence candidate -> patched."""
    monkeypatch.setattr(
        "automation.urls._search_and_score",
        lambda product, brand_slug: [Candidate("Vivo T4 5G", "https://fk.com/vivo-t4/p/1", 0.95, {})],
    )
    p = _product(flipkart_url="")
    r = verify_product(p)
    assert r.action == "patched"
    assert r.reason == "auto_found"
    assert r.new_url == "https://fk.com/vivo-t4/p/1"


def test_reject_when_no_candidate(monkeypatch):
    monkeypatch.setattr("automation.urls._search_and_score", lambda *a, **k: [])
    p = _product(flipkart_url="")
    r = verify_product(p)
    assert r.action == "reject"
    assert r.reason == "no_url_found"


# ---------------------------------------------------------------------------
# Bad product page
# ---------------------------------------------------------------------------

def test_reject_bad_product_page(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: False)
    monkeypatch.setattr("automation.urls._search_and_score", lambda *a, **k: [])
    p = _product(flipkart_url="https://fk.com/old-bad-url/p/1")
    r = verify_product(p)
    assert r.action == "reject"
    assert r.reason == "bad_page"


def test_patch_bad_page_when_candidate_found(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: False)
    monkeypatch.setattr(
        "automation.urls._search_and_score",
        lambda product, brand_slug: [Candidate("Vivo T4 5G", "https://fk.com/vivo-t4/p/2", 0.96, {})],
    )
    p = _product(flipkart_url="https://fk.com/old-bad-url/p/1")
    r = verify_product(p)
    assert r.action == "patched"
    assert r.reason == "bad_page_replaced"
    assert r.new_url == "https://fk.com/vivo-t4/p/2"


# ---------------------------------------------------------------------------
# Name mismatch
# ---------------------------------------------------------------------------

def test_name_mismatch_triggers_search(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: True)
    monkeypatch.setattr("automation.urls.url_name_matches", lambda n, u: False)
    monkeypatch.setattr(
        "automation.urls._search_and_score",
        lambda product, brand_slug: [Candidate("Vivo T4 5G", "https://fk.com/vivo-t4/p/3", 0.94, {})],
    )
    p = _product(flipkart_url="https://fk.com/wrong-product/p/x")
    r = verify_product(p)
    assert r.action == "patched"
    assert r.reason == "name_mismatch_fixed"
    assert r.confidence == 0.94


def test_name_mismatch_unresolved(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: True)
    monkeypatch.setattr("automation.urls.url_name_matches", lambda n, u: False)
    monkeypatch.setattr("automation.urls._search_and_score", lambda *a, **k: [])
    p = _product(flipkart_url="https://fk.com/wrong-product/p/x")
    r = verify_product(p)
    assert r.action == "reject"
    assert r.reason == "name_mismatch_unresolved"


# ---------------------------------------------------------------------------
# Color mismatch
# ---------------------------------------------------------------------------

def test_color_mismatch_fixes_when_candidate_found(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: True)
    monkeypatch.setattr("automation.urls.url_name_matches", lambda n, u: True)
    monkeypatch.setattr("automation.urls.url_color_matches", lambda n, u, c: False)
    monkeypatch.setattr(
        "automation.urls._search_and_score",
        lambda product, brand_slug: [Candidate("Vivo T4 Emerald Blaze", "https://fk.com/vivo-t4-emerald-blaze/p/4", 0.93, {})],
    )
    p = _product(
        flipkart_url="https://fk.com/vivo-t4-passion-red/p/x",
        colors=[{"name": "Black"}, {"name": "Blue"}],
    )
    r = verify_product(p)
    assert r.action == "patched"
    assert r.reason == "color_mismatch_fixed"


def test_color_mismatch_unresolved(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: True)
    monkeypatch.setattr("automation.urls.url_name_matches", lambda n, u: True)
    monkeypatch.setattr("automation.urls.url_color_matches", lambda n, u, c: False)
    monkeypatch.setattr("automation.urls._search_and_score", lambda *a, **k: [])
    p = _product(
        flipkart_url="https://fk.com/vivo-t4-passion-red/p/x",
        colors=[{"name": "Black"}, {"name": "Blue"}],
    )
    r = verify_product(p)
    assert r.action == "reject"
    assert r.reason == "color_mismatch_unresolved"


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

def test_verified_when_url_clean(monkeypatch):
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: True)
    monkeypatch.setattr("automation.urls.url_name_matches", lambda n, u: True)
    monkeypatch.setattr("automation.urls.url_color_matches", lambda n, u, c: True)
    p = _product(flipkart_url="https://fk.com/vivo-t4-emerald-blaze-256-gb/p/ok")
    r = verify_product(p)
    assert r.action == "verified"
    assert r.reason == "ok"
    assert r.confidence == 1.0


# ---------------------------------------------------------------------------
# run_verify writes CSV
# ---------------------------------------------------------------------------

def test_run_verify_writes_csv(tmp_path, monkeypatch):
    csv_path = str(tmp_path / "url-audit.csv")
    monkeypatch.setattr("automation.urls._is_real_product_page", lambda url: True)
    monkeypatch.setattr("automation.urls.url_name_matches", lambda n, u: True)
    monkeypatch.setattr("automation.urls.url_color_matches", lambda n, u, c: True)
    monkeypatch.setattr(
        "automation.urls.fetch_all_products",
        lambda: [
            _product(flipkart_url="https://fk.com/vivo-t4-emerald-blaze-256-gb/p/ok", brand_slug="vivo"),
        ],
    )
    import automation.urls as U
    rc = U.run_verify(csv_path)
    assert rc == 0
    assert os.path.exists(csv_path)
    with open(csv_path) as f:
        lines = f.readlines()
    assert len(lines) == 2  # header + 1 row
    assert "verified" in lines[1]


# ---------------------------------------------------------------------------
# run_apply only patches WRITE_DECISIONS
# ---------------------------------------------------------------------------

def test_run_apply_skips_non_write_decisions(tmp_path, monkeypatch):
    csv_path = str(tmp_path / "url-audit.csv")
    with open(csv_path, "w") as f:
        f.write("product_id,product_name,brand_slug,old_url,new_url,decision,reason,confidence\n")
        f.write("p-1,Test,vivo,https://old,https://new,verified,ok,1.0\n")
        f.write("p-2,Test2,oppo,https://old2,,bad_page,unresolved,0.0\n")
    written = []
    monkeypatch.setattr("automation.sanity_api.update_url", lambda pid, url: written.append((pid, url)) or {})
    import automation.urls as U
    rc = U.run_apply(csv_path)
    assert rc == 0
    assert written == []  # no WRITE_DECISIONS row in this CSV


def test_write_decisions_set():
    assert "auto_found" in WRITE_DECISIONS
    assert "url_replaced" in WRITE_DECISIONS
    assert "name_mismatch_fixed" in WRITE_DECISIONS
    assert "color_mismatch_fixed" in WRITE_DECISIONS
    assert "verified" not in WRITE_DECISIONS
