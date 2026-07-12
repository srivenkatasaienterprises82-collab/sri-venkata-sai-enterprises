import automation.launch_checker as LC


def _setup(monkeypatch, listings_by_brand, details, existing=None):
    # The launch checker now iterates over brand *slugs*, not display names.
    # Tests pass slugs that look like display names ("Motorola") — they're
    # still accepted because the slug map is built from lowercase slugs, and
    # check_launches only needs a source to be resolved for the brand it
    # scans. Mirror the live behaviour: monkeypatch the slug map too.
    monkeypatch.setattr(LC, "TRACKED_BRAND_SLUGS", list(listings_by_brand.keys()))
    monkeypatch.setattr(LC, "TRACKED_BRANDS", list(listings_by_brand.keys()))
    slug_map = {slug: "flipkart" for slug in listings_by_brand}
    monkeypatch.setattr(LC, "_SLUG_TO_SOURCE", slug_map)
    monkeypatch.setattr(LC, "_source_for_brand_slug", lambda s: slug_map.get(s))
    monkeypatch.setattr(LC, "fetch_all_products", lambda: existing or [])
    monkeypatch.setattr(
        LC, "get_brand_listings",
        lambda b, s: listings_by_brand.get(b, []),
    )
    monkeypatch.setattr(LC, "get_flipkart_details", lambda url: details)
    monkeypatch.setattr(LC, "get_amazon_details", lambda url: details)


def test_skips_already_existing(monkeypatch, capsys):
    name = "Motorola G85 5G (Blue, 128 GB)"
    _setup(monkeypatch, {"motorola": [(name, "https://flipkart.com/p/1")]},
           {"price": 17999}, existing=[{"name": name}])
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 0
    assert created == []


def test_adds_new_unmatched_draft(monkeypatch, capsys):
    name = "BrandNew X1 Pro (Black, 256 GB)"
    _setup(monkeypatch, {"motorola": [(name, "https://flipkart.com/p/2")]},
           {"price": 29999, "images": ["u1.jpg"]})
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 1
    n, brand, source, url, details = created[0]
    assert n == name
    assert brand == "motorola"
    assert source == "flipkart"
    assert details["price"] == 29999


def test_skips_implausible_price(monkeypatch, capsys):
    _setup(monkeypatch, {"motorola": [("Weird Phone", "https://flipkart.com/p/3")]},
           {"price": 50})
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 0
    assert created == []


def test_dry_run_does_not_create(monkeypatch, capsys):
    _setup(monkeypatch, {"motorola": [("DryRun Phone", "https://flipkart.com/p/4")]},
           {"price": 19999})
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches(dry_run=True)
    assert added == 1
    assert created == []
    assert "DRY RUN" in capsys.readouterr().out


def test_sync_skips_locked_product(monkeypatch, capsys):
    locked = [{
        "_id": "p1", "name": "Locked Phone", "brand": {"name": "iQOO"},
        "brandSlug": "iqoo",
        "amazonUrl": "https://amazon.in/dp/x", "price": 27999, "priceLocked": True,
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: locked)
    monkeypatch.setattr(LC, "log_change", lambda *a, **k: None)
    updated = []
    monkeypatch.setattr(LC, "update_price",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    monkeypatch.setattr(LC, "get_amazon_price", lambda u: 22999)
    monkeypatch.setattr(LC, "get_flipkart_price", lambda u: 22999)
    # url_name_matches is called before scraping, so stub it as True for the
    # test product URL (the test URL is a fake ASIN path so the heuristic
    # can't infer a slug; let it through).
    monkeypatch.setattr(LC, "url_name_matches", lambda name, url: True)
    LC.sync_prices()
    assert updated == []


def test_get_assigned_source_routes_by_slug_regardless_of_case():
    # The historical bug: Sanity has brand "POCO" (uppercase) but the
    # routing table had "Poco". Slug-based routing makes that irrelevant.
    poco_product = {
        "brand": {"name": "POCO"},
        "brandSlug": "poco",
    }
    assert LC.get_assigned_source(poco_product) == "flipkart"


def test_get_assigned_source_routes_narzo():
    # Narzo is a Realme sub-brand carried as its own brand in Sanity.
    narzo_product = {
        "brand": {"name": "Narzo"},
        "brandSlug": "narzo",
    }
    assert LC.get_assigned_source(narzo_product) == "flipkart"


def test_get_assigned_source_returns_none_for_unsupported():
    unsupported = {
        "brand": {"name": "HMD"},
        "brandSlug": "hmd",
    }
    assert LC.get_assigned_source(unsupported) is None


def test_get_assigned_source_routes_both_brands_to_both():
    # Apple/Samsung/OnePlus are sold on both platforms — the documented
    # behaviour is to scrape both and take the lower price. A regression
    # once routed them to flipkart-only, hiding Amazon-only deals.
    for slug, name in [
        ("apple", "Apple"), ("samsung", "Samsung"), ("oneplus", "OnePlus"),
    ]:
        product = {"brand": {"name": name}, "brandSlug": slug}
        assert LC.get_assigned_source(product) == "both", slug


def test_check_launches_scans_both_platforms_for_both_brand(monkeypatch, capsys):
    # A "both" brand must be discovered from Flipkart AND Amazon.
    name = "Apple iPhone 17 (Black, 256 GB)"
    _setup(
        monkeypatch,
        {
            "apple": [
                (name + " FK", "https://www.flipkart.com/p/a"),
                (name + " AZ", "https://www.amazon.in/dp/a"),
            ],
        },
        {"price": 79999, "images": ["u.jpg"]},
    )
    # Rebuild the slug map so "apple" resolves to "both".
    monkeypatch.setattr(LC, "_SLUG_TO_SOURCE", {"apple": "both"})
    monkeypatch.setattr(LC, "_source_for_brand_slug", lambda s: "both" if s == "apple" else None)
    # get_brand_listings must return the listing that belongs to each
    # platform, not the whole combined list for both calls.
    def _listings(brand, src):
        if src == "flipkart":
            return [(name + " FK", "https://www.flipkart.com/p/a")]
        return [(name + " AZ", "https://www.amazon.in/dp/a")]
    monkeypatch.setattr(LC, "get_brand_listings", _listings)
    created = []
    monkeypatch.setattr(LC, "create_full_product",
                        lambda *a, **k: created.append(a) or {"ok": True})
    added = LC.check_launches()
    assert added == 2
    # Both platforms must have been scanned for the same listing name.
    sources = {c[2] for c in created}
    assert sources == {"flipkart", "amazon"}


def test_sync_skips_url_name_mismatch(monkeypatch, capsys):
    """Sync must refuse to overwrite price if the stored URL is for a
    different product (the Redmi-A4-stored-as-A7 bug).
    """
    products = [{
        "_id": "p1",
        "name": "Redmi A4",
        "brand": {"name": "Redmi"},
        "brandSlug": "redmi",
        "amazonUrl": "https://www.amazon.in/REDMI-A7-Pro-5G-Processor/dp/B0GS5M4VMH",
        "price": 14999,
        "priceLocked": False,
        "enabled": None,
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    updated = []
    monkeypatch.setattr(LC, "update_price",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    monkeypatch.setattr(LC, "get_amazon_price",
                        lambda u: 12999)  # price of the wrong product (A7 Pro)
    # Do NOT monkeypatch url_name_matches — we want the real heuristic.
    LC.sync_prices()
    assert updated == []
    out = capsys.readouterr().out
    assert "url_name_mismatch" in out


def test_sync_skips_implausible_delta(monkeypatch, capsys):
    """The C83 case: stored URL points at a tempered-glass accessory whose
    ₹173 price would be written as the phone's price. The hard floor
    (`price_out_of_band`) catches this before the relative-delta guard. To
    prove the relative-delta guard also activates when the URL just happens
    to point at a different phone with an in-band price, see the next test.
    """
    products = [{
        "_id": "p1",
        "name": "Realme C83",
        "brand": {"name": "Realme"},
        "brandSlug": "realme",
        "flipkartUrl": (
            "https://www.flipkart.com/valight-edge-tempered-glass-realme-c83-5g-5g"
            "/p/itm9405ab466427e"
        ),
        "price": 17999,
        "priceLocked": False,
        "enabled": None,
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    updated = []
    monkeypatch.setattr(LC, "update_price",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    # We stub url_name_matches=True to bypass the URL guard (the absolute
    # `price_out_of_band` guard would still trigger on 173 ≤ ₹1000).
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    monkeypatch.setattr(LC, "get_flipkart_price", lambda u: 173)
    LC.sync_prices()
    assert updated == []
    out = capsys.readouterr().out
    assert "price_out_of_band" in out


def test_sync_rejects_implausible_relative_delta(monkeypatch, capsys):
    """An in-band but unrealistically-low price relative to the prior
    Sanity price should also be rejected. Catches scraper parsing/selectors
    that capture the wrong offer block."""
    products = [{
        "_id": "p1",
        "name": "Vivo T4",
        "brand": {"name": "Vivo"},
        "brandSlug": "vivo",
        "flipkartUrl": "https://www.flipkart.com/vivo-t4-5g-emerald-blaze-256-gb/p/itm_x",
        "price": 28999,
        "priceLocked": False,
        "enabled": None,
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    updated = []
    monkeypatch.setattr(LC, "update_price",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    # ₹8999 is well inside the band, but only 0.31x of ₹28999 → rejected
    # by the relative-delta guard.
    monkeypatch.setattr(LC, "get_flipkart_price", lambda u: 8999)
    LC.sync_prices()
    assert updated == []
    out = capsys.readouterr().out
    assert "implausible_delta" in out


def test_sync_skips_draft(monkeypatch, capsys):
    """Draft (enabled:false) products from the launch checker shouldn't be
    touched by the price sync — they're not visible on the storefront.
    """
    products = [{
        "_id": "p1",
        "name": "Incoming Phone",
        "brand": {"name": "Motorola"},
        "brandSlug": "motorola",
        "flipkartUrl": "https://www.flipkart.com/incoming-phone/p/itm_x",
        "price": 24999,
        "priceLocked": False,
        "enabled": False,
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    updated = []
    monkeypatch.setattr(LC, "update_price",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    LC.sync_prices()
    assert updated == []
    out = capsys.readouterr().out
    assert "draft_disabled" in out


def test_sync_counts_mutation_failure_without_crashing(monkeypatch, capsys):
    """A Sanity mutation error must be counted (so __main__ can exit 1) and
    must NOT abort the whole run — remaining products should still sync.
    """
    products = [
        {
            "_id": "p_ok", "name": "Good Phone", "brand": {"name": "Motorola"},
            "brandSlug": "motorola",
            "flipkartUrl": "https://www.flipkart.com/good-phone/p/itm_ok",
            "price": 24999, "priceLocked": False, "enabled": None,
        },
        {
            "_id": "p_bad", "name": "Doomed Phone", "brand": {"name": "Vivo"},
            "brandSlug": "vivo",
            "flipkartUrl": "https://www.flipkart.com/doomed-phone/p/itm_bad",
            "price": 18999, "priceLocked": False, "enabled": None,
        },
    ]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    monkeypatch.setattr(LC, "get_flipkart_price", lambda u: 19999)

    def _update(pid, *a, **k):
        if pid == "p_bad":
            raise RuntimeError("HTTP 500 boom")
        return {"results": [{"id": pid}]}

    monkeypatch.setattr(LC, "update_price", _update)
    summary = LC.sync_prices()
    assert summary["failed_mutations"] == 1
    assert summary["updated"] == 1
    out = capsys.readouterr().out
    assert "santry_mutation_failed" in out or "sanity_mutation_failed" in out

