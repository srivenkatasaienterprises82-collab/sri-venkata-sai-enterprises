/**
 * check-missing-variant-prices.ts
 *
 * Queries Sanity for products that have variants without prices.
 * Run:   npx tsx scripts/check-missing-variant-prices.ts
 *
 * Reads env vars from .env.local:
 *   NEXT_PUBLIC_SANITY_PROJECT_ID  (required)
 *   SANITY_DATASET                 (optional, defaults to "production")
 *   SANITY_TOKEN                   (required for write operations; reads work without)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// ── Config ──────────────────────────────────────────────────────────────
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
if (!PROJECT_ID) {
  console.error("❌ NEXT_PUBLIC_SANITY_PROJECT_ID is not set in .env.local");
  process.exit(1);
}
const DATASET = process.env.SANITY_DATASET || "production";
const BASE = `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`;

// ── Helpers ─────────────────────────────────────────────────────────────
function q(groq: string): string {
  return `${BASE}?query=${encodeURIComponent(groq)}`;
}

async function fetchSanity<T = unknown>(groq: string): Promise<T> {
  const url = q(groq);
  const token = process.env.SANITY_TOKEN;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Sanity query failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).result as T;
}

// ── Main ────────────────────────────────────────────────────────────────
interface Variant {
  _key: string;
  ram?: string;
  storage?: string;
  price?: number;
  originalPrice?: number;
  amazonPrice?: number;
  flipkartPrice?: number;
}

interface ProductSummary {
  _id: string;
  name: string;
  brandName: string;
  enabled: boolean;
  totalVariants: number;
  missingPriceCount: number;
  badVariants: Variant[];
  goodVariants: Variant[];
}

async function main() {
  console.log(`\n🔍 Checking Sanity project "${PROJECT_ID}" dataset "${DATASET}"...\n`);

  // ── Step 1: Summary stats ──
  const stats = await fetchSanity<Record<string, number>>(`{
    "totalProducts": count(*[_type == "product"]),
    "productsWithVariants": count(*[_type == "product" && count(variants) > 0]),
    "productsMissingVariantPrices": count(
      *[_type == "product" && count(variants[!defined(price) || price == 0]) > 0]
    ),
    "totalVariants": sum(*[_type == "product"][].count(variants)),
    "variantsMissingPrices": sum(
      *[_type == "product"][].count(variants[!defined(price) || price == 0])
    ),
    "variantsWithPrices": sum(
      *[_type == "product"][].count(variants[defined(price) && price > 0])
    ),
    "productsWithAllVariantsPriced": count(
      *[_type == "product" && count(variants) > 0
        && count(variants[!defined(price) || price == 0]) == 0]
    ),
    "productsWithoutAnyVariants": count(
      *[_type == "product" && count(variants) == 0]
    ),
    "disabledProducts": count(
      *[_type == "product" && enabled == false]
    ),
  }`);

  console.log("═══════════════════════════════════════════════");
  console.log("  SANITY PRODUCT AUDIT — SUMMARY");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Total products:              ${stats.totalProducts}`);
  console.log(`  Disabled (hidden):           ${stats.disabledProducts}`);
  console.log(`  Products with variants:      ${stats.productsWithVariants}`);
  console.log(`  Products w/o any variants:   ${stats.productsWithoutAnyVariants}`);
  console.log(`  Products ALL variants priced:${stats.productsWithAllVariantsPriced}`);
  console.log(`  Products MISSING prices:     ${stats.productsMissingVariantPrices}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Total variant slots:         ${stats.totalVariants}`);
  console.log(`  ✓ Variants WITH price:       ${stats.variantsWithPrices}`);
  console.log(`  ✗ Variants MISSING price:    ${stats.variantsMissingPrices}`);
  console.log("═══════════════════════════════════════════════\n");

  if (stats.productsMissingVariantPrices === 0) {
    console.log("✅ All products with variants have prices! Nothing to fix.\n");
    return;
  }

  // ── Step 2: Detailed list of affected products ──
  console.log("═══════════════════════════════════════════════");
  console.log("  PRODUCTS WITH MISSING VARIANT PRICES");
  console.log("═══════════════════════════════════════════════\n");

  const products = await fetchSanity<ProductSummary[]>(`*[_type == "product"
    && count(variants[!defined(price) || price == 0]) > 0
  ] | order(name asc){
    _id,
    name,
    "brandName": brand->name,
    "enabled": coalesce(enabled, true),
    "totalVariants": count(variants),
    "missingPriceCount": count(variants[!defined(price) || price == 0]),
    "badVariants": variants[!defined(price) || price == 0]{
      _key,
      ram,
      storage,
      price,
      originalPrice,
      amazonPrice,
      flipkartPrice
    },
    "goodVariants": variants[defined(price) && price > 0]{
      _key,
      ram,
      storage,
      price,
      originalPrice,
      amazonPrice,
      flipkartPrice
    }
  }`);

  for (const p of products) {
    const status = p.enabled ? "" : " [DISABLED]";
    console.log(`📱 ${p.name}${status}`);
    console.log(`   Brand: ${p.brandName || "N/A"}  |  Variants: ${p.missingPriceCount}/${p.totalVariants} missing prices`);
    console.log();

    if (p.badVariants.length > 0) {
      console.log(`   ❌ VARIANTS MISSING PRICES:`);
      for (const v of p.badVariants) {
        const ram = v.ram || "—";
        const storage = v.storage || "—";
        const hasFlipkart = v.flipkartPrice ? ` FK:₹${v.flipkartPrice}` : "";
        const hasAmazon = v.amazonPrice ? ` AZ:₹${v.amazonPrice}` : "";
        const marketplace = hasFlipkart || hasAmazon ? ` (has marketplace prices:${hasFlipkart}${hasAmazon})` : "";
        console.log(`      ${ram} / ${storage}  →  PRICE MISSING${marketplace}`);
      }
      console.log();
    }

    if (p.goodVariants.length > 0) {
      console.log(`   ✅ VARIANTS WITH PRICES (reference):`);
      for (const v of p.goodVariants) {
        const ram = v.ram || "—";
        const storage = v.storage || "—";
        const price = v.price ? `₹${v.price}` : "—";
        const orig = v.originalPrice ? ` (was ₹${v.originalPrice})` : "";
        console.log(`      ${ram} / ${storage}  →  ${price}${orig}`);
      }
      console.log();
    }
    console.log();
  }

  // ── Step 3: Fix suggestions ──
  console.log("═══════════════════════════════════════════════");
  console.log("  HOW TO FIX");
  console.log("═══════════════════════════════════════════════\n");
  console.log("  For each product above, open it in the Sanity Studio at:");
  console.log(`  https://${PROJECT_ID}.sanity.studio/studio`);
  console.log();
  console.log("  Navigate to the product, scroll to 'Variants' section,");
  console.log("  and add the missing price for each variant.");
  console.log();
  console.log("  Pricing hint: If a variant type (e.g. 12GB/512GB) has no");
  console.log("  price, look at the priced variants and apply the typical");
  console.log("  upgrade increment (₹2,000–₹5,000 per storage tier,");
  console.log("  ₹1,000–₹3,000 per RAM tier).\n");

  // ── Step 4: Products without ANY variants ──
  if (stats.productsWithoutAnyVariants > 0) {
    const noVariants = await fetchSanity<{ _id: string; name: string; price?: number }[]>(
      `*[_type == "product" && count(variants) == 0]{_id, name, price} | order(name asc)`
    );
    console.log("═══════════════════════════════════════════════");
    console.log("  PRODUCTS WITHOUT ANY VARIANTS");
    console.log("═══════════════════════════════════════════════\n");
    for (const p of noVariants) {
      console.log(`  📱 ${p.name}  (price: ${p.price ? `₹${p.price}` : "not set"})`);
    }
    console.log();
  }

  console.log("✅ Audit complete.\n");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
