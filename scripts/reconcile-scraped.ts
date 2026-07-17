/**
 * Reconcile scraped price/variant/color table (scraped-prices.tsv) against
 * the static catalog in src/lib/data/products.ts.
 *
 * Outputs, per matched product:
 *   - variants present in scraped but MISSING in our catalog (ram/storage/price/color)
 *   - variants present in both but with a price mismatch
 *   - colors present in scraped but MISSING in our catalog's color list
 *   - products in scraped NOT matched to any catalog slug
 *
 * Run: npx tsx scripts/reconcile-scraped.ts
 */
import { readFileSync } from "node:fs";
import { getAllProducts } from "../src/lib/data/products";

type ScrapedVariant = {
  ram: string;
  storage: string;
  color: string;
  price: number;
  store: string;
  available: boolean;
};

// ── Parse TSV ───────────────────────────────────────────────────────────────
function parseTsv(path: string): Record<string, ScrapedVariant[]> {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n").filter((l: string) => l.trim().length > 0);
  const header = lines[0].split("\t").map((s: string) => s.trim());
  const col = (name: string) => header.indexOf(name);

  const idx = {
    product: col("Product"),
    brand: col("Brand"),
    store: col("Store"),
    variant: col("Variant (RAM/Storage)"),
    color: col("Color"),
    price: col("Today's Price"),
    avail: col("Availability"),
    launch: col("Launch Status"),
  };

  const byProduct: Record<string, ScrapedVariant[]> = {};
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split("\t").map((s: string) => s.trim());
    const product = f[idx.product];
    const priceRaw = f[idx.price].replace(/[₹,]/g, "").trim();
    const price = Number(priceRaw);
    if (!product || product === "N/A" || f[idx.variant] === "N/A" || !Number.isFinite(price) || price <= 0) {
      // Skip "Not Found" / accessory-without-price / non-numeric rows.
      continue;
    }
    const variant = f[idx.variant]; // e.g. "8GB/256GB" or "256GB" (iPhone, no RAM)
    let ram = "", storage = "";
    if (variant.includes("/")) {
      [ram, storage] = variant.split("/").map((s: string) => s.trim().toUpperCase());
    } else {
      storage = variant.toUpperCase();
    }
    const color = f[idx.color] || "Default";
    const store = f[idx.store];
    const available = /in stock/i.test(f[idx.avail]);
    byProduct[product] = byProduct[product] || [];
    byProduct[product].push({ ram, storage, color, price, store, available });
  }
  return byProduct;
}

// ── Name → slug matcher (reuse catalog product names) ───────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCatalogIndex(): Record<string, string> {
  const idx: Record<string, string> = {};
  for (const p of getAllProducts()) {
    idx[norm(p.name)] = p.slug;
  }
  return idx;
}

// Map scraped product names to our slugs. Scraped names may differ slightly
// (e.g. "iQOO Neo 10" vs our "iqoo-neo-10", "Vivo V70" vs "vivo-v70").
function matchSlug(scrapedName: string, catalogIdx: Record<string, string>): string | null {
  const n = norm(scrapedName);
  if (catalogIdx[n]) return catalogIdx[n];
  // try token-set subset / contains
  for (const [cn, slug] of Object.entries(catalogIdx)) {
    if (n.includes(cn) || cn.includes(n)) return slug;
  }
  return null;
}

function main() {
  const scraped = parseTsv("scraped-prices.tsv");
  const catalogIdx = buildCatalogIndex();
  const catalogBySlug: Record<string, any> = {};
  for (const p of getAllProducts()) catalogBySlug[p.slug] = p;

  const matchedSlugs = new Set<string>();
  const unmatched: string[] = [];

  for (const [scrapedName, variants] of Object.entries(scraped)) {
    const slug = matchSlug(scrapedName, catalogIdx);
    if (!slug) {
      unmatched.push(scrapedName);
      continue;
    }
    matchedSlugs.add(slug);
    const prod = catalogBySlug[slug];
    const catalogVariants = prod.variants || [];
    const catalogColors = (prod.colors || []).map((c: any) => norm(c.name));

    // Build set of catalog (ram,storage) keys
    const catKey = (v: any) => `${(v.ram || "").toUpperCase()}|${(v.storage || "").toUpperCase()}`;
    const catVariantMap = new Map<string, any>();
    for (const v of catalogVariants) catVariantMap.set(catKey(v), v);

    const missingVariants: ScrapedVariant[] = [];
    const priceMismatch: { scraped: ScrapedVariant; catalogPrice: number }[] = [];
    const seenColorNorm = new Set(catalogColors);
    const missingColors = new Set<string>();

    for (const sv of variants) {
      const key = `${sv.ram}|${sv.storage}`;
      const cv = catVariantMap.get(key);
      if (!cv) {
        missingVariants.push(sv);
      } else if (typeof cv.price === "number" && cv.price !== sv.price) {
        // Allow small tolerance? Report any mismatch.
        priceMismatch.push({ scraped: sv, catalogPrice: cv.price });
      }
      const cn = norm(sv.color);
      if (cn && cn !== "n/a" && !seenColorNorm.has(cn)) {
        missingColors.add(sv.color);
      }
    }

    // variants in catalog but not in scraped (informational; may be stale)
    const scrapedKeys = new Set(variants.map((v) => `${v.ram}|${v.storage}`));
    const extraVariants = catalogVariants.filter((v: any) => !scrapedKeys.has(catKey(v)));

    if (missingVariants.length || priceMismatch.length || missingColors.size || extraVariants.length) {
      console.log(`\n=== ${prod.name} (${slug}) ===`);
      if (missingVariants.length) {
        console.log(`  MISSING variants (in scraped, not in catalog):`);
        for (const v of missingVariants) {
          console.log(`    - ${v.ram}/${v.storage} | ${v.color} | ₹${v.price} | ${v.store} | ${v.available ? "in-stock" : "oos"}`);
        }
      }
      if (priceMismatch.length) {
        console.log(`  PRICE mismatch (scraped != catalog):`);
        for (const m of priceMismatch) {
          console.log(`    - ${m.scraped.ram}/${m.scraped.storage} | ${m.scraped.color}: scraped ₹${m.scraped.price} vs catalog ₹${m.catalogPrice}`);
        }
      }
      if (missingColors.size) {
        console.log(`  MISSING colors: ${[...missingColors].join(", ")}`);
      }
      if (extraVariants.length) {
        console.log(`  EXTRA variants (in catalog, not in scraped):`);
        for (const v of extraVariants) {
          console.log(`    - ${v.ram}/${v.storage} | ₹${v.price}`);
        }
      }
    }
  }

  console.log(`\n──────────── SUMMARY ────────────`);
  console.log(`Scraped products parsed: ${Object.keys(scraped).length}`);
  console.log(`Matched to catalog: ${matchedSlugs.size}`);
  console.log(`Unmatched scraped products: ${unmatched.length}`);
  for (const u of unmatched) console.log(`   - ${u}`);
  const catalogSlugs = new Set(getAllProducts().map((p) => p.slug));
  const notInScraped = [...catalogSlugs].filter((s) => !matchedSlugs.has(s));
  console.log(`Catalog products NOT in scraped data: ${notInScraped.length}`);
  for (const s of notInScraped) console.log(`   - ${s}`);
}

main();
