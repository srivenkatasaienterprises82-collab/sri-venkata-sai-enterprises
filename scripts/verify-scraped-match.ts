import * as fs from "fs";
import { getAllProducts } from "../src/lib/data/products";
import { SCRAPED_PRICES_BY_SLUG } from "../src/lib/data/scraped-prices-data";

function norm(s: string): string {
  return s.toLowerCase().replace(/\+/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseTsv(path: string): { byName: Record<string, any[]>; rows: number } {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const header = lines[0].split("\t").map((s) => s.trim());
  const ci = (n: string) => header.indexOf(n);
  const idx = {
    product: ci("Product"), variant: ci("Variant (RAM/Storage)"),
    color: ci("Color"), price: ci("Today's Price"), mrp: ci("MRP"),
  };
  const byName: Record<string, any[]> = {};
  let rows = 0;
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split("\t").map((s) => s.trim());
    const product = f[idx.product];
    const price = Number(f[idx.price].replace(/[₹,]/g, "").trim());
    if (!product || product === "N/A" || f[idx.variant] === "N/A" || !Number.isFinite(price) || price <= 0) continue;
    rows++;
    let ram = "", storage = "";
    const v = f[idx.variant];
    if (v.includes("/")) [ram, storage] = v.split("/").map((s) => s.trim().toUpperCase());
    else storage = v.toUpperCase();
    const mrp = Number(f[idx.mrp].replace(/[₹,]/g, "").trim());
    byName[product] = byName[product] || [];
    byName[product].push({ ram, storage, color: f[idx.color] || "Default", price, mrp: Number.isFinite(mrp) ? mrp : undefined });
  }
  return { byName, rows };
}

function vKey(ram: string, storage: string): string {
  return `${ram.replace(/\s+/g, "").toLowerCase()}|${storage.replace(/\s+/g, "").toLowerCase()}`;
}

function main() {
  const { byName, rows } = parseTsv("scraped-prices.tsv");
  const catalogIdx: Record<string, string> = {};
  for (const p of getAllProducts()) catalogIdx[norm(p.name)] = p.slug;
  const ALIASES: Record<string, string> = {
    "motorola edge 70 fusion": "moto-70-fusion",
  };
  function matchSlug(n: string): string | null {
    const x = norm(n);
    if (ALIASES[x]) return ALIASES[x];
    if (catalogIdx[x]) return catalogIdx[x];
    return null;
  }

  let checked = 0, mismatch = 0;
  const report: string[] = [];
  const colorReports: string[] = [];
  for (const [name, scraped] of Object.entries(byName)) {
    const slug = matchSlug(name);
    if (!slug) { report.push(`UNMATCHED: ${name}`); continue; }
    const prod = getAllProducts().find((p) => p.slug === slug)!;
    checked++;
    const issues: string[] = [];

    const prodColors = prod.colors.map((c) => c.name.toLowerCase()).sort();
    const scrapColors = [...new Set(scraped.map((s) => s.color.toLowerCase()))].sort();
    if (JSON.stringify(prodColors) !== JSON.stringify(scrapColors)) {
      colorReports.push(`COLORNAME ${slug}: prod=[${prodColors}] scrape=[${scrapColors}]`);
    }

    const prodVar = new Map<string, any>();
    for (const v of prod.variants) prodVar.set(vKey(v.ram || "", v.storage || ""), v);
    // Scrape side: take the MIN price per ram|storage (best deal), matching the
    // generator's de-duplication, so a cheaper color/SKU doesn't false-positive.
    const scrapVar = new Map<string, any>();
    for (const s of scraped) {
      const k = vKey(s.ram, s.storage);
      const existing = scrapVar.get(k);
      if (!existing || s.price < existing.price) scrapVar.set(k, s);
    }

    if (prodVar.size !== scrapVar.size) issues.push(`VAR COUNT prod=${prodVar.size} scrape=${scrapVar.size}`);

    for (const [k, s] of scrapVar) {
      const p = prodVar.get(k);
      if (!p) { issues.push(`VAR MISSING ${k} (scrape price ${s.price})`); continue; }
      if (p.price !== s.price) issues.push(`PRICE ${k} prod=${p.price} scrape=${s.price}`);
      const sm = typeof s.mrp === "number" && s.mrp > s.price ? s.mrp : undefined;
      if (sm !== undefined && p.originalPrice !== sm) issues.push(`MRP ${k} prod=${p.originalPrice} scrape=${sm}`);
    }
    const minScrape = Math.min(...scraped.map((s) => s.price));
    if (prod.price !== minScrape) issues.push(`TOPLEVEL price prod=${prod.price} scrapeMin=${minScrape}`);

    if (issues.length) { mismatch++; report.push(`MISMATCH ${slug} (${name}):` + "\n    " + issues.join("\n    ")); }
  }

  console.log(`Scraped rows: ${rows}, matched products: ${checked}`);
  console.log(`REAL (price/variant/MRP) mismatches: ${mismatch}`);
  console.log(`COLOR-NAME-only diffs (same underlying color, marketing label differs): ${colorReports.length}`);
  if (mismatch) { console.log("\n=== REAL MISMATCHES ==="); console.log(report.join("\n")); }
  if (colorReports.length) { console.log("\n=== COLOR NAME DIFFS (sample) ==="); console.log(colorReports.slice(0, 20).join("\n")); }
}

main();
