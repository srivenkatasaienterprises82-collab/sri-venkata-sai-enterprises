/**
 * Generate src/lib/data/scraped-prices-data.ts from scraped-prices.tsv.
 * Emits one record per matched catalog slug: exact scraped color names + a
 * de-duplicated variant list (keyed by RAM|storage, best/lowest price across
 * all stores & colors, with the matching MRP as originalPrice).
 *
 * Run: npx tsx scripts/build-scraped-prices-data.ts
 */
import { getAllProducts } from "../src/lib/data/products";
import * as fs from "fs";

function norm(s: string): string {
  return s.toLowerCase().replace(/\+/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function vKey(ram: string, storage: string): string {
  return `${ram.replace(/\s+/g, "").toLowerCase()}|${storage.replace(/\s+/g, "").toLowerCase()}`;
}

function parseTsv(path: string): Record<string, any[]> {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const header = lines[0].split("\t").map((s) => s.trim());
  const ci = (n: string) => header.indexOf(n);
  const idx = {
    product: ci("Product"), variant: ci("Variant (RAM/Storage)"),
    color: ci("Color"), price: ci("Today's Price"), mrp: ci("MRP"),
  };
  const byProduct: Record<string, any[]> = {};
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split("\t").map((s) => s.trim());
    const product = f[idx.product];
    const price = Number(f[idx.price].replace(/[₹,]/g, "").trim());
    if (!product || product === "N/A" || f[idx.variant] === "N/A" || !Number.isFinite(price) || price <= 0) continue;
    const variant = f[idx.variant];
    let ram = "", storage = "";
    if (variant.includes("/")) [ram, storage] = variant.split("/").map((s) => s.trim().toUpperCase());
    else storage = variant.toUpperCase();
    const color = f[idx.color] || "Default";
    const mrp = Number(f[idx.mrp].replace(/[₹,]/g, "").trim());
    byProduct[product] = byProduct[product] || [];
    byProduct[product].push({
      ram, storage, color,
      price,
      originalPrice: Number.isFinite(mrp) && mrp > price ? mrp : undefined,
    });
  }
  return byProduct;
}

function main() {
  const scraped = parseTsv("scraped-prices.tsv");
  const catalogIdx: Record<string, string> = {};
  for (const p of getAllProducts()) catalogIdx[norm(p.name)] = p.slug;

  // Known name→slug mismatches the exact matcher can't resolve (scraped uses
  // "Motorola Edge 70 Fusion" but the catalog slug is "moto-70-fusion").
  // "Motorola Edge 70 Fusion" in the scrape maps to catalog slug moto-70-fusion
  // (its prices match). "Motorola Edge 60 Fusion" rows in the scrape actually
  // carry Edge 60 pricing, so they are intentionally left unmatched and the
  // real Edge 60 data comes from the "Motorola Edge 60" rows.
  const ALIASES: Record<string, string> = {
    "motorola edge 70 fusion": "moto-70-fusion",
  };

  function matchSlug(scrapedName: string): string | null {
    const n = norm(scrapedName);
    if (ALIASES[n]) return ALIASES[n];
    if (catalogIdx[n]) return catalogIdx[n];
    return null;
  }

  const bySlug: Record<string, { colorNames: string[]; variants: any[] }> = {};
  let matched = 0;
  for (const [name, rows] of Object.entries(scraped)) {
    const slug = matchSlug(name);
    if (!slug) continue;
    matched++;

    const colorNames = [...new Set(rows.map((r) => r.color))];

    // Dedupe variants by ram|storage, keep the lowest price (best deal) and
    // its matching MRP.
    const byKey = new Map<string, any>();
    for (const r of rows) {
      const k = vKey(r.ram, r.storage);
      const existing = byKey.get(k);
      if (!existing || r.price < existing.price) byKey.set(k, { ram: r.ram, storage: r.storage, price: r.price, originalPrice: r.originalPrice });
    }
    const variants = [...byKey.values()].sort((a, b) => a.price - b.price);

    bySlug[slug] = { colorNames, variants };
  }

  let out = `// AUTO-GENERATED from scraped-prices.tsv by scripts/build-scraped-prices-data.ts.\n`;
  out += `// Live Flipkart/Amazon price + variant + color data. Do not edit by hand.\n`;
  out += `// Applied at module load via applyScrapedPriceOverrides (src/lib/data/products.ts).\n\n`;
  out += `export interface ScrapedPriceVariant {\n`;
  out += `  ram: string;\n  storage: string;\n  price: number;\n  originalPrice?: number;\n}\n\n`;
  out += `export interface ScrapedPriceEntry {\n`;
  out += `  colorNames: string[];\n  variants: ScrapedPriceVariant[];\n}\n\n`;
  out += `export const SCRAPED_PRICES_BY_SLUG: Record<string, ScrapedPriceEntry> = `;
  out += JSON.stringify(bySlug, null, 2);
  out += `;\n`;

  fs.writeFileSync("src/lib/data/scraped-prices-data.ts", out);
  console.log(`Matched ${matched} products -> src/lib/data/scraped-prices-data.ts`);
}

main();
