/**
 * build-variants-from-md.ts
 *
 * Parses full_variants_list.md (Color x RAM x Storage with per-variant live
 * prices) and rewrites ONLY the matching products' `colors` + `variants`
 * fields inside src/lib/data/products.ts.
 *
 *   - 85 products in the file all map 1:1 to existing site slugs (verified).
 *   - The other ~49 products in products.ts are left untouched.
 *   - Colors become inline { name, hex } objects (best-effort hex mapping).
 *   - Variant prices are taken per (ram, storage); the price SHOULD differ
 *     across variants (this is what fixes the "price doesn't change" bug).
 *
 * Run:  npx tsx scripts/build-variants-from-md.ts
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const MD_PATH = 'C:\\Users\\ramak\\Downloads\\full_variants_list.md';
const PRICES_PATH = 'C:\\Users\\ramak\\Downloads\\product_variants_with_prices.md';
const CSV_PATH = 'C:\\Users\\ramak\\Downloads\\mobiles_colors_ram_storage_overview.csv';
const PRODUCTS_PATH = path.join(ROOT, 'src', 'lib', 'data', 'products.ts');
const BACKUP_PATH = path.join(ROOT, 'src', 'lib', 'data', 'products.ts.bak');

// ── Color name -> hex ────────────────────────────────────────────────────────
// First matching word wins (longest-ish order). Fallback = stable hash hue.
const PALETTE: Record<string, string> = {
  lavender: '#C4B5FD', emerald: '#10B981', indigo: '#4F46E5', violet: '#7C3AED',
  purple: '#7C3AED', orange: '#F97316', silver: '#C0C0C0', grey: '#6B7280',
  gray: '#6B7280', green: '#16A34A', black: '#1A1A1A', white: '#F5F5F5',
  blue: '#2563EB', gold: '#D4AF37', red: '#DC2626', navy: '#1E3A8A',
  pink: '#EC4899', brown: '#8B5A2B', yellow: '#EAB308', teal: '#14B8A6',
  frost: '#E0E7E9', mint: '#A7F3D0', legend: '#0F172A', alpha: '#111827',
  gibraltar: '#1E40AF', dryice: '#BAE6FD',
};
const PALETTE_KEYS = Object.keys(PALETTE);

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function hexFor(name: string): string {
  const lower = name.toLowerCase();
  for (const key of PALETTE_KEYS) if (lower.includes(key)) return PALETTE[key];
  return hslToHex(hashHue(name), 45, 55);
}

// ── Markdown parsing ──────────────────────────────────────────────────────────
type Combo = { color: string; ram: string; storage: string; price: number };
type MdProduct = {
  brand: string; name: string; colors: string[];
  ramOpts: string[]; storageOpts: string[]; combos: Combo[];
};

const md = fs.readFileSync(MD_PATH, 'utf8');
const mdLines = md.split('\n');
let currentBrand = '';
const mdProducts: MdProduct[] = [];
let cur: MdProduct | null = null;

const norm = (s: string) => s.toLowerCase().replace(/galaxy\s+/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

function slugFromName(name: string): string {
  return name.toLowerCase().replace(/galaxy\s+/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function parseRamStorage(raw: string): string {
  // "(no RAM)" / "N/A" / "" -> "" ; "8 GB" -> "8GB" ; "1 TB" -> "1TB"
  const t = raw.trim();
  if (!t || t === 'N/A' || t.startsWith('(no')) return '';
  return t.replace(/\s+/g, '');
}
function parsePrice(raw: string): number {
  const m = raw.match(/Rs\s*([\d,]+)/i);
  if (!m) return NaN;
  return parseInt(m[1].replace(/,/g, ''), 10);
}

for (const line of mdLines) {
  const b = line.match(/^##\s+(.+)$/);
  if (b) { currentBrand = b[1].trim(); continue; }
  const h = line.match(/^###\s+(.+)$/);
  if (h) {
    cur = { brand: currentBrand, name: h[1].trim(), colors: [], ramOpts: [], storageOpts: [], combos: [] };
    mdProducts.push(cur);
    continue;
  }
  if (!cur) continue;
  const col = line.match(/^\s*-\s+\*\*Colors:\*\*\s*(.+)$/);
  if (col) { cur.colors = col[1].split(',').map((s) => s.trim()).filter(Boolean); continue; }
  const ram = line.match(/^\s*-\s+\*\*RAM options:\*\*\s*(.+)$/);
  if (ram) { cur.ramOpts = ram[1].split(',').map((s) => s.trim()).filter(Boolean); continue; }
  const sto = line.match(/^\s*-\s+\*\*Storage options:\*\*\s*(.+)$/);
  if (sto) { cur.storageOpts = sto[1].split(',').map((s) => s.trim()).filter(Boolean); continue; }
  const combo = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
  if (combo) {
    const parts = combo[1].split('·').map((s) => s.trim());
    const color = parts[0] || '';
    const ramS = parts[1] ? parseRamStorage(parts[1]) : '';
    const stoS = parts[2] ? parseRamStorage(parts[2]) : '';
    cur.combos.push({ color, ram: ramS, storage: stoS, price: NaN });
    continue;
  }
  const price = line.match(/^\s*-\s+\*\*Price:\*\*\s*(.+)$/);
  if (price && cur.combos.length) {
    cur.combos[cur.combos.length - 1].price = parsePrice(price[1]);
    continue;
  }
}

// ── Parse REAL per-variant prices from product_variants_with_prices.md ─────
// full_variants_list.md collapsed every variant to one flat price. This file
// keeps the real RAM+Storage -> price tiers, which is what makes the price
// change when a variant is clicked. Keyed by both normalized name and slug.
function parseVariantDescriptor(desc: string): { ram: string; storage: string } {
  let ram = '', storage = '';
  for (const t of desc.split('+').map((s) => s.trim()).filter(Boolean)) {
    const m = t.match(/(\d+)\s*(GB|TB)/i);
    if (!m) continue;
    const val = parseInt(m[1], 10);
    const unit = m[2].toUpperCase();
    if (unit === 'TB') storage = `${val}TB`;
    else if (val <= 24) ram = `${val}GB`;
    else storage = `${val}GB`;
  }
  return { ram, storage };
}

const priceByVariant = new Map<string, Map<string, number>>();
{
  const ptext = fs.readFileSync(PRICES_PATH, 'utf8');
  let cur: Map<string, number> | null = null;
  for (const line of ptext.split('\n')) {
    const h = line.match(/^###\s+(.+)$/);
    if (h) {
      cur = new Map<string, number>();
      priceByVariant.set(norm(h[1].trim()), cur);
      priceByVariant.set(slugFromName(h[1].trim()), cur);
      continue;
    }
    if (!cur) continue;
    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*Rs\s*([\d,]+)\s*\|\s*$/);
    if (!row) continue;
    const { ram, storage } = parseVariantDescriptor(row[1]);
    const price = parseInt(row[2].replace(/,/g, ''), 10);
    if (Number.isFinite(price)) cur.set(`${ram}|${storage}`, price);
  }
}

// ── Parse COLOR + RAM/STORAGE overview CSV ──────────────────────────────────
// Authoritative source for the COLOR list and the full RAM x STORAGE variant
// matrix per product. PRICES in this file are IGNORED (unreliable) — prices
// still come from product_variants_with_prices.md. Keyed by norm name + slug.
interface CsvEntry { colors: string[]; ram: string[]; storage: string[] }
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const csvMap = new Map<string, CsvEntry>();
{
  const clines = fs.readFileSync(CSV_PATH, 'utf8').split('\n');
  for (const raw of clines) {
    const line = raw.trim();
    if (!line || line.startsWith('brand,')) continue; // header / blank
    const cols = parseCsvLine(line);
    if (cols.length < 10) continue;
    const name = cols[1].trim();
    const entry: CsvEntry = {
      colors: cols[4].split('|').map((s) => s.trim()).filter(Boolean),
      ram: cols[6].split('|').map((s) => parseRamStorage(s)).filter(Boolean),
      storage: cols[8].split('|').map((s) => parseRamStorage(s)).filter(Boolean),
    };
    csvMap.set(norm(name), entry);
    csvMap.set(slugFromName(name), entry);
  }
}

// Estimate a plausible price for a (ram,storage) combo not present in the
// trusted price source: prefer the cheapest priced variant with the same
// storage, else same RAM, else the cheapest variant overall.
function estimatePrice(ram: string, storage: string, src: Map<string, number>): number | null {
  if (src.size === 0) return null;
  const sameStorage = [...src.entries()].filter(([k]) => k.endsWith(`|${storage}`)).map(([, p]) => p);
  if (sameStorage.length) return Math.min(...sameStorage);
  const sameRam = [...src.entries()].filter(([k]) => k.startsWith(`${ram}|`)).map(([, p]) => p);
  if (sameRam.length) return Math.min(...sameRam);
  return Math.min(...src.values());
}

// ── Match markdown products to site slugs by NORMALIZED NAME ─────────────────
const ptsText = fs.readFileSync(PRODUCTS_PATH, 'utf8');
const siteMap = new Map<string, { name: string; slug: string; brand: string }>();
for (const line of ptsText.split('\n')) {
  const sn = line.match(/slug:\s*"([^"]+)"/);
  if (!sn) continue;
  const nm = line.match(/name:\s*"([^"]+)"/);
  const br = line.match(/brand:\s*"([^"]+)"/);
  if (nm) siteMap.set(sn[1], { name: nm[1], slug: sn[1], brand: br ? br[1] : '' });
}

function matchSlug(mp: MdProduct): string | null {
  const n = norm(mp.name);
  // 1) exact normalized name
  for (const p of siteMap.values()) if (norm(p.name) === n) return p.slug;
  // 2) slug derived from markdown name
  const guess = slugFromName(mp.name);
  if (siteMap.has(guess)) return guess;
  // 3) token subset + brand
  const tok = n.split(' ').filter((t) => t.length > 1);
  for (const p of siteMap.values()) {
    if (tok.every((t) => norm(p.name).includes(t)) && p.brand.toLowerCase() === mp.brand.toLowerCase()) {
      return p.slug;
    }
  }
  return null;
}

// ── Build replacement maps ────────────────────────────────────────────────────
interface Replacement { colors: string; variants: string; removeEnquiry: boolean; report: string[] }
const replacements = new Map<string, Replacement>();
let withOverrides = 0;

for (const mp of mdProducts) {
  const slug = matchSlug(mp);
  if (!slug) { console.log(`!! NO MATCH for ${mp.brand}: ${mp.name}`); continue; }

  const report: string[] = [];

  // Colors: authoritative from the CSV overview; fall back to md colors.
  const csvEntry = csvMap.get(norm(mp.name)) ?? csvMap.get(slugFromName(mp.name));
  const colorsSrc = csvEntry && csvEntry.colors.length ? csvEntry.colors : mp.colors;
  const colorObjs = colorsSrc.map((c) => `{ name: "${c}", hex: "${hexFor(c)}" }`);
  const colorsStr = `[${colorObjs.join(', ')}]`;

  // Price source: the REAL prices file when available (so unpriced matrix
  // combos can be ESTIMATED from real tiers). Fall back to md combo prices only
  // when the prices file has no entry for this product. We must NOT merge both,
  // or the flat md prices would block estimation.
  const priceOverride = priceByVariant.get(norm(mp.name)) ?? priceByVariant.get(slugFromName(mp.name));
  let priceSource: Map<string, number>;
  if (priceOverride && priceOverride.size > 0) {
    withOverrides++;
    priceSource = priceOverride;
  } else {
    priceSource = new Map();
    for (const c of mp.combos) {
      const k = `${c.ram}|${c.storage}`;
      if (Number.isFinite(c.price)) priceSource.set(k, c.price);
    }
  }

  // Variants: the full RAM x STORAGE matrix from the CSV (so every selectable
  // combo is present). Prices come from the trusted price source; any combo
  // missing a price is estimated from the nearest priced tier (same storage,
  // then same RAM, then cheapest). Accessories (no RAM/storage) keep their
  // single priced variant from the price source.
  const ramOpts = csvEntry ? csvEntry.ram.filter(Boolean) : [];
  const stoOpts = csvEntry ? csvEntry.storage.filter(Boolean) : [];
  const seen = new Map<string, { ram: string; storage: string; price: number }>();
  if (ramOpts.length && stoOpts.length) {
    for (const ram of ramOpts) {
      for (const sto of stoOpts) {
        const key = `${ram}|${sto}`;
        if (seen.has(key)) continue;
        let price = priceSource.get(key);
        if (price === undefined) price = estimatePrice(ram, sto, priceSource) ?? NaN;
        seen.set(key, { ram, storage: sto, price });
      }
    }
  } else if (priceOverride && priceOverride.size > 0) {
    for (const [key, price] of priceOverride) {
      const [ram, storage] = key.split('|');
      seen.set(key, { ram, storage, price });
    }
  } else {
    for (const c of mp.combos) {
      const key = `${c.ram}|${c.storage}`;
      if (!seen.has(key)) seen.set(key, { ram: c.ram, storage: c.storage, price: c.price });
    }
  }
  const variantArr = [...seen.values()].map(
    (v) => `{ ram: "${v.ram}", storage: "${v.storage}", price: ${v.price} }`
  );
  const variantsStr = `[${variantArr.join(', ')}]`;

  // Sanity: per-product price spread
  const prices = [...seen.values()].map((v) => v.price).filter((p) => Number.isFinite(p));
  if (prices.length > 1) {
    const min = Math.min(...prices), max = Math.max(...prices);
    if (max / min > 5) report.push(`  ⚠ price spread ${min}..${max} (${(max / min).toFixed(1)}x)`);
  }
  for (const p of prices) if (p < 1000 || p > 250000) report.push(`  ⚠ outlier price ${p}`);

  replacements.set(slug, { colors: colorsStr, variants: variantsStr, removeEnquiry: variantArr.length > 0, report });
}

// ── Apply to products.ts (only matched lines) ────────────────────────────────
fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
const lines = ptsText.split('\n');
let changed = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const sm = line.match(/slug:\s*"([^"]+)"/);
  if (!sm) continue;
  const slug = sm[1];
  const rep = replacements.get(slug);
  if (!rep) continue;

  let newLine = line
    .replace(/colors:\s*\[[^\]]*\]/, `colors: ${rep.colors}`)
    .replace(/variants:\s*\[[^\]]*\]/, `variants: ${rep.variants}`);
  if (rep.removeEnquiry) newLine = newLine.replace(/,\s*priceOnEnquiry:\s*true/, '');
  lines[i] = newLine;
  changed++;
  const r = replacements.get(slug)!;
  if (r.report.length) console.log(`• ${slug}\n${r.report.join('\n')}`);
}

fs.writeFileSync(PRODUCTS_PATH, lines.join('\n'));
console.log(`\nDONE. Products updated: ${changed} / ${replacements.size} matched. Backup: products.ts.bak`);
console.log(`Products using real per-variant prices from ${PRICES_PATH.split('\\').pop()}: ${withOverrides}`);
