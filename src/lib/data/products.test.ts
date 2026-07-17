import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAllProducts,
  getProductBySlug,
  getProductsByBrand,
  getStartingPrice,
  isPriceOnEnquiry,
} from "./products";
import { getAllBrands } from "./brands";

describe("product data helpers", () => {
  it("finds existing products by slug", () => {
    assert.equal(getProductBySlug("vivo-t4r")?.name, "Vivo T4R");
  });

  it("returns undefined for unknown product slugs", () => {
    assert.equal(getProductBySlug("iphone-16-pro-max"), undefined);
  });

  it("filters products by brand slug case-insensitively", () => {
    const products = getProductsByBrand("VIVO");

    assert.ok(products.length > 0);
    assert.equal(products.every((product) => product.brandSlug === "vivo"), true);
  });

it("calculates the lowest variant price", () => {
  const product = getProductBySlug("vivo-t4r");

  assert.ok(product);
  // Lowest variant price comes from the merged research data overlay
  // (direct-urls-data.ts): vivo-t4r 8GB+128GB / 8GB+256GB = Rs 24,999.
  assert.equal(getStartingPrice(product), 24999);
});

it("returns the lowest variant price even when a top-level price is present", () => {
  const base = getProductBySlug("vivo-t4r");

  assert.ok(base);
  // getStartingPrice prefers the minimum variant price, not the top-level price.
  assert.deepEqual(getStartingPrice({ ...(base!), price: 24500 }), 24999);
});

  it("keeps every product slug unique", () => {
    const slugs = getAllProducts().map((product) => product.slug);
    const uniqueSlugs = new Set(slugs);

    assert.equal(uniqueSlugs.size, slugs.length);
  });

  it("keeps every brand slug unique", () => {
    const slugs = getAllBrands().map((brand) => brand.slug);
    const uniqueSlugs = new Set(slugs);

    assert.equal(uniqueSlugs.size, slugs.length);
  });

  it("flags enquiry-only products correctly", () => {
    const airpods = getProductBySlug("airpods-4");
    assert.ok(airpods);
    assert.equal(isPriceOnEnquiry(airpods), true);

    const kit = getProductBySlug("infinix-gaming-kit");
    assert.ok(kit);
    assert.equal(isPriceOnEnquiry(kit), true);
  });

  it("covers every brand listed in brands.ts with at least one product", () => {
    const brandSlugs = new Set(getAllBrands().map((b) => b.slug));
    for (const slug of brandSlugs) {
      assert.ok(
        getProductsByBrand(slug).length > 0,
        `Brand "${slug}" has no products`
      );
    }
  });
});
