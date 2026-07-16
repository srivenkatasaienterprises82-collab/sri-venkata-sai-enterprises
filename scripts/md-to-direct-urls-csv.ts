/**
 * Convert product_variants_with_prices.md -> products_with_direct_urls.csv
 *
 * The Markdown has a regular structure per product:
 *   ## Brand
 *   ### Product Name
 *   - **Available Colors:** A, B, C
 *   - **URL:** /products/<slug>
 *   | Variant | Price |
 *   | 8GB + 256GB | Rs 58,999 |
 *
 * The CSV matches scripts/build-direct-urls-data.ts + direct-urls-parse.ts:
 *   brand,product,ram,storage,colors,price_inr,flipkart_url,amazon_url,verified
 *
 * Run: npx tsx scripts/md-to-direct-urls-csv.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC =
  process.argv.find((a) => a.startsWith("--in="))?.slice("--in=".length) ||
  "C:\\Users\\ramak\\Downloads\\product_variants_with_prices.md";
const OUT =
  process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ||
  "C:\\Users\\ramak\\Downloads\\products_with_direct_urls.csv";

const text = readFileSync(SRC, "utf8");
const lines = text.split(/\r?\n/);

function parsePrice(raw: string): number | undefined {
  const v = raw.trim().replace(/^Rs\s*/i, "").replace(/,/g, "").trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function splitVariant(variant: string): { ram: string; storage: string } {
  const v = variant.trim();
  if (/^standard\b/i.test(v)) return { ram: "", storage: "" };
  const m = v.match(/^(\d+\s*GB)\s*\+\s*(\d+\s*(?:GB|TB))$/i);
  if (m) return { ram: m[1].replace(/\s+/g, " ").trim(), storage: m[2].replace(/\s+/g, " ").trim() };
  // Fallback: take first token-ish segment
  return { ram: v, storage: "" };
}

const rows: string[][] = [
  ["brand", "product", "ram", "storage", "colors", "price_inr", "flipkart_url", "amazon_url", "verified"],
];

let currentBrand = "";
let cur: {
  brand: string;
  name: string;
  colors: string[];
  slug: string;
  variants: { ram: string; storage: string; price: number | undefined }[];
} | null = null;

function flush() {
  if (!cur) return;
  for (const v of cur.variants) {
    rows.push([
      cur.brand,
      cur.name,
      v.ram,
      v.storage,
      cur.colors.join("|"),
      v.price !== undefined ? String(v.price) : "",
      "",
      "",
      "true",
    ]);
  }
  cur = null;
}

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  if (/^##\s+/.test(trimmed)) {
    flush();
    currentBrand = trimmed.replace(/^##\s+/, "").trim();
    continue;
  }

  if (/^###\s+/.test(trimmed)) {
    flush();
    const name = trimmed.replace(/^###\s+/, "").trim();
    cur = { brand: currentBrand, name, colors: [], slug: "", variants: [] };
    continue;
  }

  if (!cur) continue;

  const colorsMatch = trimmed.match(/\*\*Available Colors:\*\*\s*(.+)$/);
  if (colorsMatch) {
    cur.colors = colorsMatch[1]
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    continue; // do NOT let the colors line fall through to variant parsing
  }

  const urlMatch = trimmed.match(/\*\*URL:\*\*\s*\/products\/([\w-]+)/);
  if (urlMatch) {
    cur.slug = urlMatch[1];
    continue;
  }

  // Variant table row: | 8GB + 256GB | Rs 58,999 |
  // Must start with '|' and the LEFT cell must look like a real variant
  // (RAM+Storage like "8GB + 256GB", or "Standard" for accessories).
  // This filters out the header "Variant", the separator "|---------|-------|",
  // and the "**Available Colors:**" bullet (which has no leading '|' anyway).
  const rowMatch = trimmed.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/);
  if (rowMatch) {
    const left = rowMatch[1].trim();
    const right = rowMatch[2].trim();
    const isHeader = /variant/i.test(left) || /price/i.test(right);
    const isSeparator = /^[-|]+$/.test(left) || /^[-|]+$/.test(right);
    const looksLikeVariant =
      /^standard\b/i.test(left) ||
      /\d+\s*GB\s*\+\s*\d+\s*(?:GB|TB)/i.test(left);
    if (isHeader || isSeparator || !looksLikeVariant) continue;
    const { ram, storage } = splitVariant(left);
    const price = parsePrice(right);
    cur.variants.push({ ram, storage, price });
  }
}

flush();

const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
writeFileSync(OUT, csv + "\n");
console.log(`Wrote ${rows.length - 1} rows to ${OUT}`);
