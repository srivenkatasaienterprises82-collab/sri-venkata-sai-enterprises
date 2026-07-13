import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseDirectUrlsCsv,
  matchSlugs,
  findSearchUrls,
  normalizeRam,
  normalizeStorage,
} from "./direct-urls-parse";
import { mapColorName, buildMergedVariants } from "./direct-urls-overlay";
import type { DirectUrlProduct, DirectUrlVariant } from "./direct-urls-parse";
import type { ProductVariant } from "./products";

const SAMPLE = `brand,product,ram,storage,colors,price_inr,flipkart_url,amazon_url,verified,url_source
Apple,iPhone 17,8 GB,256 GB,Lavender | Sage | Mist Blue | White | Black,79900,https://www.flipkart.com/apple-iphone-17-black-256-gb/p/itm6eb39da622cdd,,True,flipkart
Apple,iPhone 17,8 GB,512 GB,Lavender | Sage | Mist Blue | White | Black,6000,https://www.flipkart.com/apple-iphone-17-pro-deep-blue-512-gb/p/itmce30d684c921a,,True,flipkart
Apple,Apple AirPods 4,N/A,N/A,White,12900,https://www.flipkart.com/apple-airpods-4/p/itmdf102348be4b9,,True,flipkart`;

describe("parseDirectUrlsCsv", () => {
  const agg = parseDirectUrlsCsv(SAMPLE);

  it("aggregates rows into one product per name", () => {
    const names = agg.map((a) => a.rawName).sort();
    assert.deepEqual(names, ["Apple AirPods 4", "iPhone 17"]);
  });

  it("collects all variant rows for a product", () => {
    const iphone = agg.find((a) => a.rawName === "iPhone 17")!;
    assert.equal(iphone.variants.length, 2);
  });

  it("splits colors by pipe delimiter and dedupes", () => {
    const iphone = agg.find((a) => a.rawName === "iPhone 17")!;
    assert.deepEqual(iphone.colorNames, ["Lavender", "Sage", "Mist Blue", "White", "Black"]);
  });

  it("normalizes N/A ram/storage to empty", () => {
    const airpods = agg.find((a) => a.rawName === "Apple AirPods 4")!;
    assert.equal(airpods.variants[0].ram, "");
    assert.equal(airpods.variants[0].storage, "");
  });

  it("parses price and verified flag", () => {
    const airpods = agg.find((a) => a.rawName === "Apple AirPods 4")!;
    assert.equal(airpods.variants[0].price, 12900);
    assert.equal(airpods.variants[0].verified, true);
  });

  it("captures product-level marketplace url from first variant", () => {
    const iphone = agg.find((a) => a.rawName === "iPhone 17")!;
    assert.match(iphone.flipkartUrl ?? "", /flipkart\.com\/.*\/p\//);
    assert.equal(iphone.amazonUrl, undefined);
  });
});

describe("normalize helpers", () => {
  it("treats N/A as empty", () => {
    assert.equal(normalizeRam("N/A"), "");
    assert.equal(normalizeStorage("n/a"), "");
  });
  it("keeps GB/TB labels", () => {
    assert.equal(normalizeRam("12 GB"), "12 GB");
    assert.equal(normalizeStorage("1 TB"), "1 TB");
  });
});

describe("matchSlugs", () => {
  const agg = parseDirectUrlsCsv(SAMPLE);
  const slugs = ["iphone-17", "airpods-4", "pixel-10"];
  const names = ["iPhone 17", "Apple AirPods 4", "Google Pixel 10"];

  it("matches known product names to slugs", () => {
    const res = matchSlugs(agg, slugs, names);
    const matchedSlugs = res.matched.map((m) => m.slug).sort();
    assert.deepEqual(matchedSlugs, ["airpods-4", "iphone-17"]);
    assert.equal(res.unknown.length, 0);
  });

  it("reports unmatched products", () => {
    const res = matchSlugs(agg, ["pixel-10"], ["Google Pixel 10"]);
    assert.deepEqual(res.unknown.sort(), ["Apple AirPods 4", "iPhone 17"]);
  });
});

describe("findSearchUrls", () => {
  it("detects search urls and ignores direct ones", () => {
    const product: DirectUrlProduct = {
      brand: "X",
      name: "X",
      colorNames: [],
      variants: [
        { ram: "8 GB", storage: "256 GB", flipkartUrl: "https://www.flipkart.com/search?q=foo", verified: false },
        { ram: "8 GB", storage: "512 GB", amazonUrl: "https://www.amazon.in/dp/B0X", verified: true },
      ] as DirectUrlVariant[],
    };
    const bad = findSearchUrls([product]);
    assert.equal(bad.length, 1);
    assert.match(bad[0], /search/);
  });
});

describe("mapColorName", () => {
  it("maps composite color names to the palette", () => {
    assert.equal(mapColorName("Cosmic Orange").name, "Orange");
    assert.equal(mapColorName("Deep Blue").name, "Blue");
    assert.equal(mapColorName("Lavender").hex, "#C4B5FD");
    assert.equal(mapColorName("Obsidian").name, "Black");
    assert.equal(mapColorName("Lemongrass").name, "Green");
  });
  it("is deterministic for unknown names", () => {
    const a = mapColorName("Zebra Stripe");
    const b = mapColorName("Zebra Stripe");
    assert.equal(a.hex, b.hex);
  });
});

describe("buildMergedVariants", () => {
  const csv: DirectUrlProduct = {
    brand: "X",
    name: "X",
    colorNames: [],
    variants: [
      { ram: "8 GB", storage: "256 GB", price: 6000, flipkartUrl: "https://flipkart.com/p/aa", verified: true },
      { ram: "8 GB", storage: "512 GB", price: 99999, amazonUrl: "https://amazon.in/dp/B1", verified: true },
    ],
  };

  it("preserves an existing price when the ram/storage combo matches", () => {
    const existing: ProductVariant[] = [{ ram: "8GB", storage: "256GB", price: 79900 }];
    const merged = buildMergedVariants(existing, csv);
    const v = merged.find((m) => m.storage === "256 GB")!;
    assert.equal(v.price, 79900); // kept curated price, ignored bogus 6000
    assert.equal(v.flipkartUrl, "https://flipkart.com/p/aa");
  });

  it("fills a new combo price from CSV and carries per-variant urls", () => {
    const existing: ProductVariant[] = [{ ram: "8GB", storage: "256GB", price: 79900 }];
    const merged = buildMergedVariants(existing, csv);
    const v = merged.find((m) => m.storage === "512 GB")!;
    assert.equal(v.price, 99999);
    assert.equal(v.amazonUrl, "https://amazon.in/dp/B1");
  });
});
