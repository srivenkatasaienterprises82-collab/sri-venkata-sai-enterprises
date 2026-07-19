from automation.parser import vote, confident_price, dom_fingerprint, MIN_CONFIDENCE


def test_vote_jsonld_alone_on_product_page_clears_gate():
    # A single strong (jsonld) strategy on a real product page must clear the
    # confidence gate (item 11/12): structured data is trustworthy alone.
    r = vote([("jsonld", 24999)], is_product_page=True, fingerprint="abc")
    assert r.price == 24999
    assert r.confidence >= MIN_CONFIDENCE
    assert confident_price(r) == 24999


def test_vote_single_weak_css_rejected():
    # A lone CSS/regex extraction with no corroboration stays below the gate.
    r = vote([("card_css", 24999)], is_product_page=True, fingerprint="abc")
    assert r.price == 24999
    assert r.confidence < MIN_CONFIDENCE
    assert confident_price(r) is None


def test_vote_two_weak_strategies_agree_clears_gate():
    r = vote([("card_css", 24999), ("regex", 24999)], is_product_page=True, fingerprint="abc")
    assert r.confidence >= MIN_CONFIDENCE
    assert confident_price(r) == 24999


def test_vote_disagreement_drops_to_modal_no_clear():
    # jsonld 24999 (strong=2) vs card_css 89999 (weak=1): modal is 24999 with
    # weighted agreement 2 -> clears gate (the strong signal wins).
    r = vote([("jsonld", 24999), ("card_css", 89999)], is_product_page=True, fingerprint="abc")
    assert r.price == 24999
    assert r.confidence >= MIN_CONFIDENCE


def test_vote_no_price():
    r = vote([("jsonld", None), ("card_css", None)], is_product_page=True)
    assert r.price is None
    assert confident_price(r) is None


def test_vote_not_product_page_rejected():
    # Even a strong strategy on a non-product page (interstitial) is rejected.
    r = vote([("jsonld", 24999)], is_product_page=False, fingerprint="abc")
    assert r.confidence < MIN_CONFIDENCE
    assert confident_price(r) is None


def test_dom_fingerprint_stable_and_changes_on_layout():
    html_a = "<html><body><div class='Nx9bqj'>24999</div></body></html>"
    html_b = "<html><body><div class='Nx9bqj'>24999</div></body></html>"
    html_c = "<html><body><span class='price'>24999</span></body></html>"
    assert dom_fingerprint(html_a) == dom_fingerprint(html_b)
    assert dom_fingerprint(html_a) != dom_fingerprint(html_c)
