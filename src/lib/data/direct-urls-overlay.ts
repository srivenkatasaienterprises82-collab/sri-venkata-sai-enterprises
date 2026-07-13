// Runtime overlay that merges CSV-derived direct-URL / variant / color data
// into the static product catalog. Imported by products.ts at module load so
// both the website and the Sanity seed see the enriched data.
import { C } from "./colors";
import type { Product, ProductColor, ProductVariant } from "./products";
import type { DirectUrlProduct } from "./direct-urls-parse";
import { DIRECT_URLS_BY_SLUG, DIRECT_URLS_META } from "./direct-urls-data";

// Leaf colors first so they win over ambiguous modifiers (e.g. "Titanium Silver" -> silver).
const COLOR_KEYWORDS: [string, keyof typeof C][] = [
  ["orange", "orange"],
  ["blue", "blue"],
  ["black", "black"],
  ["white", "white"],
  ["gold", "gold"],
  ["silver", "silver"],
  ["green", "green"],
  ["red", "red"],
  ["purple", "purple"],
  ["violet", "violet"],
  ["grey", "grey"],
  ["gray", "grey"],
  ["pink", "pink"],
  ["navy", "navy"],
  ["indigo", "indigo"],
  ["teal", "teal"],
  ["brown", "brown"],
  ["yellow", "yellow"],
  ["mint", "mint"],
  ["emerald", "emerald"],
  ["lavender", "lavender"],
  ["frost", "frost"],
  ["dryice", "dryice"],
  ["gibraltar", "gibraltar"],
  ["alpha", "alpha"],
  ["legend", "legend"],
  ["obsidian", "black"],
  ["porcelain", "white"],
  ["aloe", "green"],
  ["bay", "blue"],
  ["lemongrass", "green"],
  ["peach", "pink"],
  ["sand", "grey"],
  ["ash", "grey"],
  ["chrome", "grey"],
  ["meteor", "grey"],
  ["moonknight", "grey"],
  ["graphite", "grey"],
  ["phantom", "grey"],
  ["marble", "grey"],
  ["solar", "orange"],
  ["lunar", "grey"],
  ["shadow", "black"],
  ["dark", "black"],
  ["arctic", "white"],
  ["dawn", "white"],
  ["sage", "green"],
  ["rose", "pink"],
  ["beige", "grey"],
  ["ocean", "blue"],
  ["glacier", "blue"],
  ["nebula", "purple"],
  ["aurora", "green"],
  ["stardust", "purple"],
  ["silk", "green"],
  ["stellar", "blue"],
  ["flare", "black"],
  ["knight", "grey"],
  ["eclipse", "black"],
  ["marshmallow", "blue"],
  ["koala", "grey"],
  ["ballad", "blue"],
  ["pulse", "green"],
  ["blade", "white"],
  ["titanium", "grey"],
  ["cosmic", "grey"],
  ["midnight", "black"],
  ["light", "white"],
  ["awesome", "grey"],
  ["space", "black"],
  ["starry", "black"],
  ["storm", "black"],
  ["cyber", "blue"],
  ["phoenix", "gold"],
  ["blaze", "orange"],
  ["inferno", "red"],
  ["coral", "red"],
  ["jade", "green"],
  ["champagne", "gold"],
  ["sunset", "orange"],
  ["raging", "blue"],
  ["onyx", "black"],
  ["surf", "blue"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function mapColorName(name: string): ProductColor {
  const lower = name.toLowerCase();
  for (const [kw, key] of COLOR_KEYWORDS) {
    if (lower.includes(kw)) return { ...C[key] };
  }
  const paletteKeys = Object.keys(C) as (keyof typeof C)[];
  const fallback = paletteKeys[hashString(lower) % paletteKeys.length];
  return { name, hex: C[fallback].hex };
}


function variantKey(ram: string, storage: string): string {
  return `${ram.replace(/\s+/g, "").toLowerCase()}|${storage.replace(/\s+/g, "").toLowerCase()}`;
}

function isSanePrice(price: number | undefined): price is number {
  return typeof price === "number" && price >= 1000 && price <= 400000;
}

export function buildMergedVariants(
  existing: ProductVariant[],
  csv: DirectUrlProduct,
): ProductVariant[] {
  const existingByKey = new Map<string, ProductVariant>();
  for (const v of existing) existingByKey.set(variantKey(v.ram, v.storage), v);

  return csv.variants.map((cv) => {
    const key = variantKey(cv.ram, cv.storage);
    const existingVariant = existingByKey.get(key);
    const price =
      existingVariant && typeof existingVariant.price === "number"
        ? existingVariant.price
        : isSanePrice(cv.price)
          ? cv.price
          : undefined;
    const originalPrice = existingVariant?.originalPrice;
    return {
      ram: cv.ram,
      storage: cv.storage,
      ...(price !== undefined ? { price } : {}),
      ...(originalPrice !== undefined ? { originalPrice } : {}),
      ...(cv.amazonUrl ? { amazonUrl: cv.amazonUrl } : {}),
      ...(cv.flipkartUrl ? { flipkartUrl: cv.flipkartUrl } : {}),
    } satisfies ProductVariant;
  });
}

export function applyDirectUrlOverrides(products: Product[]): Product[] {
  const slugSet = new Set(products.map((p) => p.slug));
  return products.map((product) => {
    const csv = DIRECT_URLS_BY_SLUG[product.slug];
    if (!csv || !slugSet.has(product.slug)) return product;

    const colorMap = new Map<string, ProductColor>();
    for (const name of csv.colorNames) {
      const c = mapColorName(name);
      if (!colorMap.has(c.name)) colorMap.set(c.name, c);
    }
    const colors = [...colorMap.values()];

    const ramSeen = new Set<string>();
    const storageSeen = new Set<string>();
    const ramOptions: string[] = [];
    const storageOptions: string[] = [];
    for (const v of csv.variants) {
      if (v.ram && !ramSeen.has(v.ram)) {
        ramSeen.add(v.ram);
        ramOptions.push(v.ram);
      }
      if (v.storage && !storageSeen.has(v.storage)) {
        storageSeen.add(v.storage);
        storageOptions.push(v.storage);
      }
    }

    const variants = buildMergedVariants(product.variants, csv);

    return {
      ...product,
      colors,
      ramOptions: ramOptions.length ? ramOptions : product.ramOptions,
      storageOptions: storageOptions.length ? storageOptions : product.storageOptions,
      variants,
      amazonUrl: csv.amazonUrl ?? product.amazonUrl,
      flipkartUrl: csv.flipkartUrl ?? product.flipkartUrl,
    };
  });
}

export const DIRECT_URLS_DEBUG = DIRECT_URLS_META;
