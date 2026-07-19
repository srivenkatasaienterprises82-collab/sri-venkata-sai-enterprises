// Runtime overlay merging live scraped price/variant/color data
// (scraped-prices-data.ts, derived from scraped-prices.tsv) into the static
// catalog. Mirrors the existing direct-urls-overlay pattern and is applied at
// module load in products.ts so the website and the Sanity seed both see it.
import type { Product, ProductColor, ProductVariant } from "./products";
import { mapColorName } from "./direct-urls-overlay";
import { SCRAPED_PRICES_BY_SLUG } from "./scraped-prices-data";

export function applyScrapedPriceOverrides(products: Product[]): Product[] {
  return products.map((product) => {
    const entry = SCRAPED_PRICES_BY_SLUG[product.slug];
    if (!entry || entry.variants.length === 0) return product;

    // Colours: keep the EXACT scraped marketing name (e.g. "Arctic White",
    // "Obsidian") but reuse the palette hex resolved from mapColorName.
    const colorMap = new Map<string, ProductColor>();
    for (const name of entry.colorNames) {
      const resolved = mapColorName(name);
      const color: ProductColor = { name, hex: resolved.hex };
      if (!colorMap.has(name.toLowerCase())) colorMap.set(name.toLowerCase(), color);
    }
    const colors = [...colorMap.values()];

    // Variants: take scraped ram/storage/price + MRP as originalPrice.
    // Floor is 100 (Jio feature phones are ~Rs800-999); ceiling guards typos.
    // The overlay intentionally does NOT set amazonPrice/flipkartPrice — those
    // come from the live 6h price-sync automation once it sees a per-variant
    // market price from each marketplace. Setting them here would bake a
    // single-marketplace snapshot into the static fallback.
    const variants: ProductVariant[] = entry.variants
      .filter((v): v is { ram: string; storage: string; price: number; originalPrice?: number } =>
        typeof v.price === "number" && v.price >= 100 && v.price <= 400000)
      .map((v) => ({
        ram: v.ram,
        storage: v.storage,
        price: v.price,
        ...(typeof v.originalPrice === "number" ? { originalPrice: v.originalPrice } : {}),
      }));

    if (variants.length === 0) return product;

    // Derive RAM / Storage option lists so the product page renders the
    // variant selector buttons (clicking them updates the displayed price via
    // matchingVariant in product-detail.tsx).
    const ramSeen = new Set<string>();
    const storageSeen = new Set<string>();
    const ramOptions: string[] = [];
    const storageOptions: string[] = [];
    for (const v of variants) {
      if (v.ram && !ramSeen.has(v.ram)) {
        ramSeen.add(v.ram);
        ramOptions.push(v.ram);
      }
      if (v.storage && !storageSeen.has(v.storage)) {
        storageSeen.add(v.storage);
        storageOptions.push(v.storage);
      }
    }

    const minPrice = Math.min(...variants.map((v) => v.price ?? Number.MAX_SAFE_INTEGER));

    return {
      ...product,
      colors,
      ramOptions: ramOptions.length ? ramOptions : product.ramOptions,
      storageOptions: storageOptions.length ? storageOptions : product.storageOptions,
      variants,
      price: minPrice,
    };
  });
}
