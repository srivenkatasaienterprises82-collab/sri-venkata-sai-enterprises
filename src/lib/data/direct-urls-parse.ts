// Pure parsing + aggregation for products_with_direct_urls.csv
// No fs imports — testable and reused by the build script.

export const DEFAULT_DIRECT_URLS_CSV_PATH =
  "C:\\Users\\ramak\\Downloads\\products_with_direct_urls.csv";

export interface DirectUrlVariant {
  ram: string;
  storage: string;
  price?: number;
  flipkartUrl?: string;
  amazonUrl?: string;
  verified: boolean;
}

export interface DirectUrlProduct {
  brand: string;
  name: string;
  colorNames: string[];
  variants: DirectUrlVariant[];
  amazonUrl?: string;
  flipkartUrl?: string;
}

export interface AggregatedDirectUrlProduct extends DirectUrlProduct {
  rawName: string;
}

const COLORS_DELIMITER = "|";

function splitCsvLine(line: string): string[] {
  // Minimal RFC4180-aware splitter; handles quoted fields with commas.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeRam(value: string): string {
  const v = clean(value);
  if (!v || /^n\/a\b/i.test(v)) return "";
  return v;
}

export function normalizeStorage(value: string): string {
  const v = clean(value);
  if (!v || /^n\/a\b/i.test(v)) return "";
  return v;
}

export function normalizeColorName(value: string): string {
  return clean(value);
}

function parsePrice(value: string): number | undefined {
  const v = clean(value);
  if (!v || /^n\/a\b/i.test(v)) return undefined;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseVerified(value: string): boolean {
  return /^true$/i.test(clean(value));
}

function nonEmpty(value: string): string | undefined {
  const v = clean(value);
  return v ? v : undefined;
}

function splitColors(value: string): string[] {
  return value
    .split(COLORS_DELIMITER)
    .map(normalizeColorName)
    .filter(Boolean);
}

export function parseDirectUrlsCsv(text: string): AggregatedDirectUrlProduct[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map((h) => clean(h).toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iBrand = idx("brand");
  const iProduct = idx("product");
  const iRam = idx("ram");
  const iStorage = idx("storage");
  const iColors = idx("colors");
  const iPrice = idx("price_inr");
  const iFlipkart = idx("flipkart_url");
  const iAmazon = idx("amazon_url");
  const iVerified = idx("verified");

  const byProduct = new Map<string, AggregatedDirectUrlProduct>();

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const rawName = clean(cols[iProduct] ?? "");
    if (!rawName) continue;
    const brand = clean(cols[iBrand] ?? "");
    const ram = normalizeRam(cols[iRam] ?? "");
    const storage = normalizeStorage(cols[iStorage] ?? "");
    const colors = splitColors(cols[iColors] ?? "");
    const variant: DirectUrlVariant = {
      ram,
      storage,
      price: parsePrice(cols[iPrice] ?? ""),
      flipkartUrl: nonEmpty(cols[iFlipkart] ?? ""),
      amazonUrl: nonEmpty(cols[iAmazon] ?? ""),
      verified: parseVerified(cols[iVerified] ?? ""),
    };

    const existing = byProduct.get(rawName);
    if (existing) {
      existing.variants.push(variant);
      for (const c of colors) {
        if (!existing.colorNames.includes(c)) existing.colorNames.push(c);
      }
      existing.amazonUrl = existing.amazonUrl ?? variant.amazonUrl;
      existing.flipkartUrl = existing.flipkartUrl ?? variant.flipkartUrl;
    } else {
      byProduct.set(rawName, {
        rawName,
        brand,
        name: rawName,
        colorNames: [...colors],
        variants: [variant],
        amazonUrl: variant.amazonUrl,
        flipkartUrl: variant.flipkartUrl,
      });
    }
  }

  return [...byProduct.values()];
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugFromName(s: string): string {
  return normKey(s).replace(/\s+/g, "-");
}

export interface SlugMatchResult {
  matched: { rawName: string; slug: string; product: DirectUrlProduct }[];
  unknown: string[];
}

/**
 * Match CSV product names to existing product slugs.
 * Tries exact normalized name, then slugified name, then name with a leading
 * brand word stripped.
 */
export function matchSlugs(
  aggregated: AggregatedDirectUrlProduct[],
  productSlugs: string[],
  productNames: string[],
): SlugMatchResult {
  const slugSet = new Set(productSlugs);
  const nameMap = new Map<string, string>();
  productNames.forEach((n, i) => nameMap.set(normKey(n), productSlugs[i]));
  const matched: SlugMatchResult["matched"] = [];
  const unknown: string[] = [];

  for (const agg of aggregated) {
    let slug = nameMap.get(normKey(agg.rawName));
    if (!slug && slugSet.has(slugFromName(agg.rawName))) {
      slug = slugFromName(agg.rawName);
    }
    if (!slug) {
      const stripped = agg.rawName.replace(/^[A-Za-z0-9]+\s+/, "");
      slug =
        nameMap.get(normKey(stripped)) ??
        (slugSet.has(slugFromName(stripped)) ? slugFromName(stripped) : undefined);
    }
    if (slug && slugSet.has(slug)) {
      matched.push({ rawName: agg.rawName, slug, product: agg });
    } else {
      unknown.push(agg.rawName);
    }
  }
  return { matched, unknown };
}

export function findSearchUrls(products: DirectUrlProduct[]): string[] {
  const bad: string[] = [];
  for (const p of products) {
    for (const url of [
      p.amazonUrl,
      p.flipkartUrl,
      ...p.variants.flatMap((v) => [v.amazonUrl, v.flipkartUrl]),
    ]) {
      if (url && (url.includes("/search") || url.includes("/s?k="))) bad.push(url);
    }
  }
  return bad;
}
