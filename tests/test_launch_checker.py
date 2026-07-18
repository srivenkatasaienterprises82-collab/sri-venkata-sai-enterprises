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
    monkeypatch.setattr(LC, "update_price_and_variants",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    monkeypatch.setattr(LC, "get_amazon_details", lambda u: {"price": 22999, "variants": []})
    monkeypatch.setattr(LC, "get_flipkart_details", lambda u: {"price": 22999, "variants": []})
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
    # HMD/Infinix are now tracked (routed to "both"); use a genuinely
    # unsupported brand as the example instead.
    unsupported = {
        "brand": {"name": "Nokia"},
        "brandSlug": "nokia",
    }
    assert LC.get_assigned_source(unsupported) is None


def test_get_assigned_source_routes_both_brands_to_both():
    # OnePlus is sold on both platforms — the documented behaviour is to
    # scrape both and take the lower price.
    # Apple/Samsung are now routed to Flipkart-only (moved from "both" to
    # "flipkart" brand slugs) to avoid cross-platform conflicts.
    product = {"brand": {"name": "OnePlus"}, "brandSlug": "oneplus"}
    assert LC.get_assigned_source(product) == "both", "oneplus"
    for slug, name in [("apple", "Apple"), ("samsung", "Samsung")]:
        product = {"brand": {"name": name}, "brandSlug": slug}
        assert LC.get_assigned_source(product) == "flipkart", slug


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
    monkeypatch.setattr(LC, "update_price_and_variants",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
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
        "variants": [{"ram": "4GB", "storage": "64GB", "price": 17999}],
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    updated = []
    monkeypatch.setattr(LC, "update_price_and_variants",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    # We stub url_name_matches=True to bypass the URL guard (the absolute
    # `price_out_of_band` guard would still trigger on 173 ≤ ₹1000).
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    monkeypatch.setattr(LC, "get_flipkart_details", lambda u: {"price": 173, "variants": []})
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
        "variants": [{"ram": "8GB", "storage": "128GB", "price": 28999}],
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    updated = []
    monkeypatch.setattr(LC, "update_price_and_variants",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    # ₹8999 is well inside the band, but only 0.31x of ₹28999 → rejected
    # by the relative-delta guard.
    monkeypatch.setattr(LC, "get_flipkart_details", lambda u: {"price": 8999, "variants": []})
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
    monkeypatch.setattr(LC, "update_price_and_variants",
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
            "variants": [{"ram": "8GB", "storage": "128GB", "price": 24999}],
        },
        {
            "_id": "p_bad", "name": "Doomed Phone", "brand": {"name": "Vivo"},
            "brandSlug": "vivo",
            "flipkartUrl": "https://www.flipkart.com/doomed-phone/p/itm_bad",
            "price": 18999, "priceLocked": False, "enabled": None,
            "variants": [{"ram": "8GB", "storage": "256GB", "price": 18999}],
        },
    ]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    monkeypatch.setattr(LC, "get_flipkart_details", lambda u: {"price": 19999, "variants": []})

    def _update(pid, *a, **k):
        if pid == "p_bad":
            raise RuntimeError("HTTP 500 boom")
        return {"results": [{"id": pid}]}

    monkeypatch.setattr(LC, "update_price_and_variants", _update)
    summary = LC.sync_prices()
    assert summary["failed_mutations"] == 1
    assert summary["updated"] == 1
    out = capsys.readouterr().out
    assert "santry_mutation_failed" in out or "sanity_mutation_failed" in out


def test_launch_checker_ignores_variant_metadata(monkeypatch):
    import launch_checker

    product = {
        "_id": "product-test-phone",
        "name": "Test Phone",
        "slug": {"current": "test-phone"},
        "brandSlug": "iqoo",
        "amazonUrl": "https://www.amazon.in/Test-Phone/dp/B0TESTPHONE",
        "flipkartUrl": "",
        "price": 10000,
        "colors": [{"name": "Black", "hex": "#000000"}],
        "ramOptions": ["8 GB"],
        "storageOptions": ["128 GB"],
        "variants": [{"ram": "8GB", "storage": "128GB", "price": 10000}],
    }

    monkeypatch.setattr(launch_checker, "fetch_all_products", lambda: [product])
    monkeypatch.setattr(launch_checker, "get_assigned_source", lambda p: "amazon")
    monkeypatch.setattr(launch_checker, "url_name_matches", lambda name, url: True)
    monkeypatch.setattr(launch_checker, "get_amazon_details", lambda url: {"price": 9999})
    monkeypatch.setattr(launch_checker, "update_price_and_variants", lambda *args, **kwargs: {"results": [{"id": "product-test-phone"}]})

    result = launch_checker.sync_prices()
    assert result["checked"] == 1


def test_sync_skips_color_mismatch(monkeypatch, capsys):
    """A URL whose slug names a colour the product doesn't come in must be
    refused (the V70 Elite 'passion-red' vs a Black/Blue/Gold palette case)
    and logged as url_color_mismatch rather than writing the wrong colourway's
    price onto the canonical product.
    """
    products = [{
        "_id": "p1",
        "name": "Vivo V70 Elite",
        "brand": {"name": "Vivo"},
        "brandSlug": "vivo",
        "flipkartUrl": (
            "https://www.flipkart.com/vivo-v70-elite-passion-red-2026-256-gb"
            "/p/itmf8e28e33a9cd0"
        ),
        "price": 51999,
        "priceLocked": False,
        "enabled": None,
        "colors": [
            {"name": "Black"}, {"name": "Blue"}, {"name": "Gold"},
        ],
        "variants": [{"ram": "8GB", "storage": "256GB", "price": 51999}],
    }]
    monkeypatch.setattr(LC, "fetch_all_products", lambda: products)
    # url_name_matches passes (both contain "v70-elite"); the colour guard is
    # what should reject this one.
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    updated = []
    monkeypatch.setattr(LC, "update_price_and_variants",
                        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]})
    LC.sync_prices()
    assert updated == []
    out = capsys.readouterr().out
    assert "url_color_mismatch" in out


def test_sync_recovers_via_research(monkeypatch, capsys):
    """When the stored URL returns no price (transient bot-check on CI IPs),
    the sync must re-resolve the product URL from the brand's live listings
    and re-scrape ONCE before giving up. The recovered price is then applied.
    """
    product = {
        "_id": "p1", "name": "Moto G85", "brand": {"name": "Motorola"},
        "brandSlug": "motorola",
        "flipkartUrl": "https://www.flipkart.com/moto-g85-stale/p/itm_old",
        "price": 17999, "priceLocked": False, "enabled": None,
        "variants": [{"ram": "8GB", "storage": "128GB", "price": 17999}],
    }
    monkeypatch.setattr(LC, "fetch_all_products", lambda: [product])
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    # First (stale) URL returns nothing; the re-search url returns a price.
    monkeypatch.setattr(
        LC, "get_flipkart_details",
        lambda u: {"price": 16999, "variants": []}
        if "fresh" in u else {"price": None, "variants": []},
    )
    monkeypatch.setattr(
        LC, "get_brand_listings",
        lambda b, s: [("Moto G85", "https://www.flipkart.com/moto-g85-fresh/p/itm_new")],
    )
    updated = []
    monkeypatch.setattr(
        LC, "update_price_and_variants",
        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]},
    )
    summary = LC.sync_prices()
    assert summary["updated"] == 1
    assert summary["recovered"] == 1
    out = capsys.readouterr().out
    assert "Recovered URL" in out


def test_sync_falls_back_to_other_source_when_blocked(monkeypatch, capsys):
    """Single-source brand (Flipkart-only) whose primary marketplace serves a
    bot-check interstitial would otherwise stay stale forever. If the product
    carries a URL on the *other* marketplace, the sync must try it once and
    write the recovered price — keeping the storefront fresh.
    """
    product = {
        "_id": "p1", "name": "Moto G85", "brand": {"name": "Motorola"},
        "brandSlug": "motorola",
        "flipkartUrl": "https://www.flipkart.com/moto-g85/p/itm_fk",
        "amazonUrl": "https://www.amazon.in/Moto-G85/dp/B0FALLBACK",
        "price": 17999, "priceLocked": False, "enabled": None,
        "variants": [{"ram": "8GB", "storage": "128GB", "price": 17999}],
    }
    monkeypatch.setattr(LC, "fetch_all_products", lambda: [product])
    # Primary (Flipkart) blocked; fallback to Amazon returns a price.
    monkeypatch.setattr(LC, "get_flipkart_details", lambda u: {"price": None, "variants": []})
    monkeypatch.setattr(LC, "get_amazon_details", lambda u: {"price": 16999, "variants": []})
    monkeypatch.setattr(LC, "url_name_matches", lambda n, u: True)
    updated = []
    monkeypatch.setattr(
        LC, "update_price_and_variants",
        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]},
    )
    summary = LC.sync_prices()
    assert summary["updated"] == 1
    out = capsys.readouterr().out
    assert "fallback" in out


def test_sync_counts_blocked_when_no_fallback(monkeypatch, capsys):
    """If the primary source is blocked AND no alternate URL exists, the
    product is counted as scrape_blocked (telemetry) and not updated.
    """
    product = {
        "_id": "p1", "name": "Moto G85", "brand": {"name": "Motorola"},
        "brandSlug": "motorola",
        "flipkartUrl": "https://www.flipkart.com/moto-g85/p/itm_fk",
        "amazonUrl": "",
        "price": 17999, "priceLocked": False, "enabled": None,
        "variants": [{"ram": "8GB", "storage": "128GB", "price": 17999}],
    }
    monkeypatch.setattr(LC, "fetch_all_products", lambda: [product])
    monkeypatch.setattr(LC, "get_flipkart_details", lambda u: {"price": None, "variants": []})
    monkeypatch.setattr(LC, "get_amazon_details", lambda u: {"price": None, "variants": []})
    updated = []
    monkeypatch.setattr(
        LC, "update_price_and_variants",
        lambda *a, **k: updated.append(a) or {"results": [{"id": "p1"}]},
    )
    summary = LC.sync_prices()
    assert summary["updated"] == 0
    assert summary["scrape_blocked"] == 1
    assert updated == []


def test_is_fresh_true_when_recently_updated():
    from datetime import datetime, timezone, timedelta
    recent = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    assert LC._is_fresh({"lastPriceUpdatedAt": recent}) is True


def test_is_fresh_false_when_older_than_window():
    from datetime import datetime, timezone, timedelta
    old = (datetime.now(timezone.utc) - timedelta(hours=LC.FRESH_WINDOW_HOURS + 1)).isoformat()
    assert LC._is_fresh({"lastPriceUpdatedAt": old}) is False


def test_is_fresh_false_without_timestamp():
    # Never updated -> never fresh -> must be scraped (so bot-walled products
    # are retried rather than skipped forever).
    assert LC._is_fresh({}) is False
    assert LC._is_fresh({"lastPriceUpdatedAt": None}) is False


def test_is_fresh_false_on_bad_timestamp():
    assert LC._is_fresh({"lastPriceUpdatedAt": "not-a-date"}) is False


def test_sync_skips_fresh_products(monkeypatch):
    # A product updated an hour ago must be delta-skipped, not scraped.
    from datetime import datetime, timezone, timedelta
    recent = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    product = {
        "_id": "p1",
        "name": "X Phone",
        "slug": "x-phone",
        "brand": {"name": "Motorola", "slug": "motorola"},
        "price": 10000,
        "flipkartUrl": "https://flipkart.com/x",
        "variants": [],
        "lastPriceUpdatedAt": recent,
    }
    _setup(monkeypatch, {"motorola": []}, {"price": 9999, "variants": []}, existing=[product])
    scraped = []
    monkeypatch.setattr(
        LC, "get_flipkart_details",
        lambda u: scraped.append(u) or {"price": 9999, "variants": []},
    )
    summary = LC.sync_prices()
    assert summary["skipped_fresh"] == 1
    assert scraped == []  # never hit the network for a fresh product


