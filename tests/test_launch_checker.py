import automation.launch_checker as LC


def _setup(monkeypatch, listings_by_brand, details, existing=None):
    monkeypatch.setattr(LC, "TRACKED_BRANDS", list(listings_by_brand.keys()))
    monkeypatch.setattr(LC, "fetch_all_products", lambda: existing or [])
    monkeypatch.setattr(
        LC, "get_brand_listings",
        lambda b, s: listings_by_brand.get(b, []),
    )
    monkeypatch.setattr(LC, "get_flipkart_details", lambda url: details)
    monkeypatch.setattr(LC, "get_amazon_details", lambda url: details)


def test_skips_already_existing(monkeypatch, capsys):
    name = "Motorola G85 5G (Blue, 128 GB)"
    _setup(monkeypatch, {"Motorola": [(name, "https://flipkart.com/p/1")]},
           {"price": 17999}, existing=[{"name": name}])
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 0
    assert created == []


def test_adds_new_unmatched_draft(monkeypatch, capsys):
    name = "BrandNew X1 Pro (Black, 256 GB)"
    _setup(monkeypatch, {"Motorola": [(name, "https://flipkart.com/p/2")]},
           {"price": 29999, "images": ["u1.jpg"]})
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 1
    n, brand, source, url, details = created[0]
    assert n == name
    assert brand == "Motorola"
    assert source == "flipkart"
    assert details["price"] == 29999


def test_skips_implausible_price(monkeypatch, capsys):
    _setup(monkeypatch, {"Motorola": [("Weird Phone", "https://flipkart.com/p/3")]},
           {"price": 50})
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 0
    assert created == []


def test_dry_run_does_not_create(monkeypatch, capsys):
    _setup(monkeypatch, {"Motorola": [("DryRun Phone", "https://flipkart.com/p/4")]},
           {"price": 19999})
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches(dry_run=True)
    assert added == 1
    assert created == []
    assert "DRY RUN" in capsys.readouterr().out
