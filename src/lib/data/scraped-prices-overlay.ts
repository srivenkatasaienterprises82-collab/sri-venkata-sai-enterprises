// Runtime overlay merging live scraped price/variant/color data
// (scraped-prices-data.ts, derived from scraped-prices.tsv) into the static
// catalog. Mirrors the existing direct-urls-overlay pattern and is applied at
// module load in products.ts so the website and the Sanity seed both see it.
import type { Product, ProductColor, ProductVariant } from "./products";
import { mapColorName } from "./direct-urls-overlay";
import { SCRAPED_PRICES_BY_SLUG } from "./scraped-prices-data";

function variantKey(ram: string, storage: string): string {
  return `${ram.replace(/\s+/g, "").toLowerCase()}|${storage.replace(/\s+/g, "").toLowerCase()}`;
}

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

    const minPrice = Math.min(...variants.map((v) => v.price ?? Number.MAX_SAFE_INTEGER));

    return {
      ...product,
      colors,
      variants,
      price: minPrice,
    };
  });
}
