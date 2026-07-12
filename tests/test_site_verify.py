import csv
import io
import sys
from unittest import mock

import site_verify as SV


def _product(name="Oppo K13", slug="oppo-k13", price=21999, enabled=True):
    return {
        "name": name,
        "slug": {"_type": "slug", "current": slug},
        "price": price,
        "enabled": enabled,
    }


def test_extract_price_from_jsonld():
    html = '<script type="application/ld+json">{"price": 21999, "priceCurrency": "INR"}</script>'
    assert SV.extract_price(html) == 21999


def test_extract_price_jsonld_string_form():
    html = '{"offers": {"price": "12999"}}'
    assert SV.extract_price(html) == 12999


def test_extract_price_falls_back_to_rupee_text():
    html = '<span class="text-4xl">₹12,999</span>'
    assert SV.extract_price(html) == 12999


def test_extract_price_none_when_absent():
    assert SV.extract_price("<html>no price here</html>") is None


def test_verify_skips_disabled_and_null_price():
    prods = [
        _product(enabled=False),
        {"name": "X", "slug": {"current": "x"}, "price": None, "enabled": True},
        {"name": "Y", "slug": None, "price": 999, "enabled": True},
    ]
    res = SV.verify_products(prods)
    assert res == []


def test_verify_ok_and_mismatch():
    prods = [
        _product(slug="ok-phone", price=1000),
        _product(name="Wrong", slug="bad-phone", price=2000),
    ]
    sess = mock.MagicMock()
    # order matters: first call ok, second mismatch
    html_ok = '{"price": 1000}'
    html_bad = '{"price": 9999}'
    resp_ok = mock.MagicMock(status_code=200, text=html_ok)
    resp_bad = mock.MagicMock(status_code=200, text=html_bad)
    sess.get.side_effect = [resp_ok, resp_bad]
    res = SV.verify_products(prods, session=sess)
    assert [r["status"] for r in res] == ["ok", "mismatch"]
    assert res[1]["live_price"] == 9999


def test_verify_http_error_and_exception():
    prods = [
        _product(slug="e1", price=1),
        _product(slug="e2", price=2),
    ]
    sess = mock.MagicMock()
    resp = mock.MagicMock(status_code=503, text="")
    sess.get.side_effect = [resp, RuntimeError("boom")]
    res = SV.verify_products(prods, session=sess)
    assert res[0]["status"] == "http_error"
    assert res[1]["status"] == "error"


def test_verify_no_price_found():
    prods = [_product(slug="np", price=5)]
    sess = mock.MagicMock()
    sess.get.return_value = mock.MagicMock(status_code=200, text="<html>no price</html>")
    res = SV.verify_products(prods, session=sess)
    assert res[0]["status"] == "no_price"


def test_main_exits_nonzero_on_mismatch_and_writes_csv(tmp_path):
    csv_path = tmp_path / "site_price_mismatch.csv"
    with mock.patch.object(SV, "OUT_CSV", str(csv_path)), \
         mock.patch.object(SV, "fetch_all_products", return_value=[_product(price=2000)]), \
         mock.patch("site_verify.requests.Session") as Sess:
        sess = Sess.return_value
        sess.get.return_value = mock.MagicMock(status_code=200, text='{"price": 9999}')
        with mock.patch.object(sys, "exit") as exit_mock:
            try:
                SV.main()
            except SystemExit:
                pass
            assert mock.call(1) in exit_mock.call_args_list
    rows = list(csv.reader(open(str(csv_path), encoding="utf-8")))
    assert rows[0] == ["name", "slug", "sanity_price", "live_price", "status", "detail"]
    assert rows[1][4] == "mismatch"
