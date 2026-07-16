/**
 * Audit: Compare static products.ts variants vs CSV overlay variants
 * Usage: npx tsx scripts/audit-variant-gaps.ts
 */
import { products } from "../src/lib/data/products";
import { DIRECT_URLS_BY_SLUG } from "../src/lib/data/direct-urls-data";
import type { Product } from "../src/lib/data/products";
import type { DirectUrlProduct } from "../src/lib/data/direct-urls-parse";

// ── Helpers ──
function variantKey(ram: string, storage: string) {
  return `${ram.replace(/\s+/g, "").toLowerCase()}|${storage.replace(/\s+/g, "").toLowerCase()}`;
}

function hasModelId(url: string, product: Product): boolean {
  const slug = url.split("/")[3] || "";
  const modelWords = product.name.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/);
  const keywords = ["smartphone", "mobile", "phone", "storage", "segments", "fastest", "processor", "smoothest", "creative", "wireless", "charging", "military", "shock", "resistance", "dimensity", "qualcomm", "snapdragon"];
  
  // Check if slug has any identifiable model word
  for (const word of modelWords) {
    if (word.length >= 2 && slug.includes(word)) return true;
  }
  // Check if slug only has generic keywords
  const slugWords = slug.split("-").filter(w => w.length > 2);
  const meaningfulWords = slugWords.filter(w => !keywords.includes(w));
  return meaningfulWords.length > 0;
}

function isSearchUrl(url: string): boolean {
  return url.includes("/search?") || url.includes("search?");
}

function hasAccessoryKeywords(url: string): boolean {
  const accessories = ["tempered-glass", "screen-guard", "phone-cover", "back-cover", "silicone", "case", "charger", "cable", "adapter", "protector", "bumper", "skin", "cover-", "-cover"];
  return accessories.some(k => url.includes(k));
}

// ── Analysis ──
const csvSlugs = new Set(Object.keys(DIRECT_URLS_BY_SLUG));

console.log("══════════════════════════════════════════════════════════");
console.log("  PRODUCT VARIANT & URL AUDIT REPORT");
console.log("══════════════════════════════════════════════════════════\n");

const issues: string[] = [];

for (const product of products) {
  const csv = DIRECT_URLS_BY_SLUG[product.slug];
  const hasCsv = csvSlugs.has(product.slug);
  
  // ── 1. Variant mismatch ──
  if (hasCsv && csv) {
    const staticKeys = new Set(product.variants.map(v => variantKey(v.ram, v.storage)));
    const csvKeys = new Set(csv.variants.map(v => variantKey(v.ram, v.storage)));
    
    // Variants in CSV but NOT in static
    const missingInStatic = [...csvKeys].filter(k => !staticKeys.has(k));
    // Variants in static but NOT in CSV
    const extraInStatic = [...staticKeys].filter(k => !csvKeys.has(k));
    
    if (missingInStatic.length > 0) {
      issues.push(`⚠️  ${product.name}: CSV has ${missingInStatic.length} variant(s) NOT in static: ${missingInStatic.join(", ")}`);
    }
    if (extraInStatic.length > 0) {
      issues.push(`📝 ${product.name}: Static has ${extraInStatic.length} variant(s) NOT in CSV: ${extraInStatic.join(", ")}`);
    }
    
    // ── Color mismatch ──
    if (csv.colorNames.length !== product.colors.length) {
      const csvColorNames = csv.colorNames.map(c => c.toLowerCase());
      const staticColorNames = product.colors.map(c => c.name.toLowerCase());
      const missingColors = csvColorNames.filter(c => !staticColorNames.includes(c));
      const extraColors = staticColorNames.filter(c => !csvColorNames.includes(c));
      if (missingColors.length > 0) {
        issues.push(`🎨 ${product.name}: CSV colors missing from static: ${missingColors.join(", ")}`);
      }
      if (extraColors.length > 0) {
        issues.push(`🎨 ${product.name}: Static colors not in CSV: ${extraColors.join(", ")}`);
      }
    }

    // ── Generic Amazon URL check ──
    for (const url of [product.amazonUrl, ...product.variants.map(v => v.amazonUrl)].filter(Boolean) as string[]) {
      if (isSearchUrl(url)) {
        issues.push(`🔍 ${product.name}: Amazon URL is a SEARCH page: ${url.slice(0, 80)}`);
      } else if (hasAccessoryKeywords(url)) {
        issues.push(`🚫 ${product.name}: Amazon URL has accessory keywords: ${url.slice(0, 80)}`);
      } else if (!hasModelId(url, product)) {
        // Check if DirectUrlProduct has a variant-level amazonUrl that's better
        const csvVariantUrls = csv.variants.map(v => v.amazonUrl).filter(Boolean) as string[];
        const csvTopUrl = csv.amazonUrl;
        const hasBetterUrl = csvTopUrl && hasModelId(csvTopUrl, product) || csvVariantUrls.some(u => hasModelId(u, product));
        if (!hasBetterUrl) {
          issues.push(`🔗 ${product.name}: Generic Amazon URL (no model ID in slug): ${url.slice(0, 80)}`);
        }
      }
    }

    // ── Generic Flipkart URL check ──
    for (const url of [product.flipkartUrl, ...product.variants.map(v => v.flipkartUrl)].filter(Boolean) as string[]) {
      if (isSearchUrl(url)) {
        issues.push(`🔍 ${product.name}: Flipkart URL is a SEARCH page: ${url.slice(0, 80)}`);
      } else if (hasAccessoryKeywords(url)) {
        issues.push(`🚫 ${product.name}: Flipkart URL has accessory keywords: ${url.slice(0, 80)}`);
      }
    }

    // ── Price gap check ──
    for (const cv of csv.variants) {
      const key = variantKey(cv.ram, cv.storage);
      const sv = product.variants.find(v => variantKey(v.ram, v.storage) === key);
      if (sv && cv.price && sv.price && Math.abs(sv.price - cv.price) > 1000) {
        issues.push(`💰 ${product.name}: ${cv.ram}/${cv.storage} price differs — static: ₹${sv.price}, CSV: ₹${cv.price}`);
      }
    }
  }
  
  // ── Missing marketplace URLs ──
  if (product.type === "smartphone") {
    const hasFk = product.flipkartUrl || product.variants.some(v => v.flipkartUrl);
    const hasAz = product.amazonUrl || product.variants.some(v => v.amazonUrl);
    if (!hasFk && !hasAz) {
      issues.push(`❌ ${product.name}: SMARTPHONE with NO marketplace URLs`);
    }
  }
}

// ── Summary stats ──
const totalProducts = products.length;
const withCsvData = [...csvSlugs].filter(s => products.some(p => p.slug === s)).length;

console.log(`Products: ${totalProducts}`);
console.log(`Products with CSV overlay data: ${withCsvData}`);
console.log(`Products without CSV data: ${totalProducts - withCsvData}`);
console.log(`\nIssues found: ${issues.length}\n`);

// Group issues by type
const byType: Record<string, string[]> = {};
for (const issue of issues) {
  const type = issue.slice(0, 2);
  if (!byType[type]) byType[type] = [];
  byType[type].push(issue);
}

console.log("─── Issue Breakdown ───\n");
for (const [type, items] of Object.entries(byType)) {
  const labels: Record<string, string> = {
    "⚠️": "Variant Mismatches",
    "📝": "Extra Static Variants",
    "🎨": "Color Mismatches",
    "🔍": "Search URLs",
    "🚫": "Accessory URLs",
    "🔗": "Generic URLs",
    "💰": "Price Gaps",
    "❌": "Missing URLs",
  };
  console.log(`${labels[type] || type} (${items.length}):`);
  for (const item of items) {
    console.log(`  ${item}`);
  }
  console.log("");
}
