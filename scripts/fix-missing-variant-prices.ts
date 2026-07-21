/**
 * fix-missing-variant-prices.ts
 *
 * Auto-calculates and fills in missing variant prices in Sanity by analyzing
 * the pricing patterns of existing priced variants (RAM increments, storage
 * tier increments).
 *
 * Run with --dry-run (default) to preview:
 *   npx tsx scripts/fix-missing-variant-prices.ts
 *
 * Run with --apply to actually write to Sanity (SANITY_TOKEN required):
 *   npx tsx scripts/fix-missing-variant-prices.ts --apply
 *
 * Run with --apply --force to overwrite ALL variants (not just missing):
 *   npx tsx scripts/fix-missing-variant-prices.ts --apply --force
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
if (!PROJECT_ID) {
  console.error("❌ NEXT_PUBLIC_SANITY_PROJECT_ID is not set in .env.local");
  process.exit(1);
}
const DATASET = process.env.SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_TOKEN;
const QUERY_BASE = `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${DATASET}`;
const MUTATE_BASE = `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`;

// ── CLI flags ───────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

if (APPLY && !TOKEN) {
  console.error("❌ SANITY_TOKEN is required for --apply mode (not set in .env.local)");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────
async function fetchSanity<T = unknown>(groq: string): Promise<T> {
  const url = `${QUERY_BASE}?query=${encodeURIComponent(groq)}`;
  const headers: Record<string, string> = {};
  if (TOKEN) headers["Authorization"] = `Bearer ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status}): ${await res.text()}`);
  return (await res.json()).result as T;
}

async function mutateSanity(mutations: any[]): Promise<any> {
  const res = await fetch(MUTATE_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`Sanity mutate failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/** Extract numeric part from a size label like "8GB" → 8, "128GB" → 128. */
function numericGB(s: string | undefined | null): number {
  if (!s) return 0;
  const m = s.replace(/\s+/g, "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ── Interfaces ──────────────────────────────────────────────────────────
interface Variant {
  _key: string;
  ram?: string;
  storage?: string;
  price?: number;
  originalPrice?: number;
  flipkartPrice?: number;
  amazonPrice?: number;
}

interface SanityProduct {
  _id: string;
  name: string;
  brandName: string;
  enabled: boolean;
  variants: Variant[];
  totalVariants: number;
  missingPriceCount: number;
}

// ── Pricing Intelligence ────────────────────────────────────────────────

interface PricingPatterns {
  /** Per-unit storage cost in ₹/GB based on this product's priced variants. */
  storagePerGB: number;
  /** Per-unit RAM cost in ₹/GB based on this product's priced variants. */
  ramPerGB: number;
  /** Intercept price at 0GB storage + 0GB RAM (for estimation). */
  basePrice: number;
  /** The cheapest priced variant's storage label (e.g. "128GB"). */
  cheapestStorage: string;
  /** The cheapest priced variant's RAM label (e.g. "8GB"). */
  cheapestRam: string;
  /** The cheapest priced variant's price. */
  cheapestPrice: number;
  /** Whether we have enough data for a reliable estimate (≥2 priced variants). */
  confident: boolean;
  /** The typical markup ratio originalPrice/price from existing priced variants. */
  originalPriceRatio: number;
}

/** Analyze the priced variants to determine RAM and storage tier increments. */
function analyzePricingPatterns(variants: Variant[]): PricingPatterns | null {
  const priced = variants.filter(
    (v) => typeof v.price === "number" && v.price > 0
  );

  // Can't estimate without any reference price
  if (priced.length === 0) return null;

  // Sort by storage first, then RAM
  const sorted = [...priced].sort((a, b) => {
    const sDiff = numericGB(a.storage) - numericGB(b.storage);
    if (sDiff !== 0) return sDiff;
    return numericGB(a.ram) - numericGB(b.ram);
  });

  const cheapest = sorted[0];
  const cheapestPrice = cheapest.price!;
  const cheapestRam = cheapest.ram || "";
  const cheapestStorage = cheapest.storage || "";

  // Collect storage increments (price diff / storage GB diff) and RAM increments
  const storageIncrements: number[] = [];
  const ramIncrements: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    const curStorage = numericGB(cur.storage);
    const prevStorage = numericGB(prev.storage);
    const curRam = numericGB(cur.ram);
    const prevRam = numericGB(prev.ram);
    const priceDiff = cur.price! - prev.price!;

    // Same RAM, different storage -> pure storage cost
    if (curRam === prevRam && curStorage > prevStorage && priceDiff > 0) {
      storageIncrements.push(priceDiff / (curStorage - prevStorage));
    }

    // Same storage, different RAM -> pure RAM cost
    if (curStorage === prevStorage && curRam > prevRam && priceDiff > 0) {
      ramIncrements.push(priceDiff / (curRam - prevRam));
    }
  }

  // Cross-pair analysis for variants that differ in both RAM and storage
  for (let i = 0; i < priced.length; i++) {
    for (let j = i + 1; j < priced.length; j++) {
      const a = priced[i];
      const b = priced[j];
      const aSize = numericGB(a.storage) + numericGB(a.ram) * 4;
      const bSize = numericGB(b.storage) + numericGB(b.ram) * 4;

      if (aSize >= bSize) continue;
      if ((b.price ?? 0) <= (a.price ?? 0)) continue;

      const storageDiff = numericGB(b.storage) - numericGB(a.storage);
      const ramDiff = numericGB(b.ram) - numericGB(a.ram);
      const priceDiff = (b.price ?? 0) - (a.price ?? 0);

      if (storageDiff > 0 && ramDiff > 0 && priceDiff > 0) {
        const avgRamCost =
          ramIncrements.length > 0
            ? ramIncrements.reduce((s, v) => s + v, 0) / ramIncrements.length
            : 1500;
        const avgStorageCost =
          storageIncrements.length > 0
            ? storageIncrements.reduce((s, v) => s + v, 0) / storageIncrements.length
            : 200;
        const computed = avgRamCost * ramDiff + avgStorageCost * storageDiff;
        if (computed > 0) {
          const ratio = priceDiff / computed;
          ramIncrements.push(avgRamCost * ratio);
          storageIncrements.push(avgStorageCost * ratio);
        }
      }
    }
  }

  const storagePerGB =
    storageIncrements.length > 0
      ? Math.round(storageIncrements.reduce((s, v) => s + v, 0) / storageIncrements.length)
      : 250;

  const ramPerGB =
    ramIncrements.length > 0
      ? Math.round(ramIncrements.reduce((s, v) => s + v, 0) / ramIncrements.length)
      : 150;

  // Base price = extrapolate from cheapest variant to 0GB/0GB
  const basePrice = Math.max(
    0,
    cheapestPrice -
      numericGB(cheapestStorage) * storagePerGB -
      numericGB(cheapestRam) * ramPerGB
  );

  // Derive the average originalPrice ratio from existing priced variants
  const pricedWithOrig = priced.filter(
    (v) => typeof v.originalPrice === "number" && v.originalPrice > 0 && v.price! > 0
  );
  const originalPriceRatio =
    pricedWithOrig.length > 0
      ? pricedWithOrig.reduce((s, v) => s + v.originalPrice! / v.price!, 0) /
        pricedWithOrig.length
      : 1.15; // default ~15% above

  return {
    storagePerGB,
    ramPerGB,
    basePrice,
    cheapestStorage,
    cheapestRam,
    cheapestPrice,
    confident: priced.length >= 2 || storageIncrements.length > 0 || ramIncrements.length > 0,
    originalPriceRatio: Math.round(originalPriceRatio * 100) / 100,
  };
}

/** Estimate a price for a variant based on pricing patterns. */
function estimatePrice(
  ram: string | undefined,
  storage: string | undefined,
  patterns: PricingPatterns
): number | null {
  const ramGB = numericGB(ram);
  const storageGB = numericGB(storage);
  if (ramGB === 0 && storageGB === 0) return null;

  // Compute price from base + per-GB costs
  const estimated = Math.round(
    patterns.basePrice + storageGB * patterns.storagePerGB + ramGB * patterns.ramPerGB
  );

  // Sanity check: estimated price should be within 30-200% of the cheapest variant
  const ratio = estimated / patterns.cheapestPrice;
  if (ratio < 0.3 || ratio > 2.0) {
    // Fall back to a simple difference-based estimate from the cheapest variant
    const cheapestRamGB = numericGB(patterns.cheapestRam);
    const cheapestStorageGB = numericGB(patterns.cheapestStorage);
    const diffRam = Math.max(0, ramGB - cheapestRamGB);
    const diffStorage = Math.max(0, storageGB - cheapestStorageGB);
    return Math.round(
      patterns.cheapestPrice + diffRam * 1500 + diffStorage * 200
    );
  }

  return estimated;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔧 Variant Price Auto-Fix Tool`);
  console.log(`   Project: ${PROJECT_ID} / ${DATASET}`);
  console.log(`   Mode:    ${APPLY ? "LIVE (--apply)" : "DRY RUN (pass --apply to write)"}`);
  if (FORCE) console.log(`   Force:   Overwriting ALL variants (not just missing)`);
  console.log();

  // ── 1. Fetch all products with variants ──
  const products = await fetchSanity<SanityProduct[]>(`*[_type == "product"
    && count(variants) > 0
  ] | order(name asc){
    _id,
    name,
    "brandName": brand->name,
    "enabled": coalesce(enabled, true),
    "totalVariants": count(variants),
    "missingPriceCount": count(variants[!defined(price) || price == 0]),
    variants[]{
      _key,
      ram,
      storage,
      price,
      originalPrice,
      flipkartPrice,
      amazonPrice
    }
  }`);

  // ── 2. Process each product and store mutation data ──
  interface FixPlan {
    name: string;
    _id: string;
    updatedVariants: Variant[];
    changes: string[];
    fixCount: number;
  }

  const plans: FixPlan[] = [];
  let skippedNoReference = 0;

  for (const product of products) {
    const variants = product.variants || [];
    if (variants.length === 0) continue;

    // Determine which variants need a price
    const needsFix = FORCE
      ? variants
      : variants.filter((v) => !v.price || v.price === 0);
    if (needsFix.length === 0) continue;

    // Analyze pricing patterns from priced variants
    const patterns = analyzePricingPatterns(variants);
    if (!patterns) {
      skippedNoReference++;
      continue;
    }

    const changes: string[] = [];
    let fixCount = 0;

    const updatedVariants: Variant[] = variants.map((v) => {
      const needsPriceFix = FORCE || !v.price || v.price === 0;
      if (!needsPriceFix) return v;

      const estimated = estimatePrice(v.ram, v.storage, patterns);
      if (estimated === null) {
        changes.push(`  ${v.ram || "?"}/${v.storage || "?"}: SKIP (cannot estimate)`);
        return v;
      }

      fixCount++;

      const conf = patterns.confident ? "✓" : "⚠";
      if (!v.price || v.price === 0) {
        changes.push(
          `  ${v.ram || "?"}/${v.storage || "?"}: MISSING → ₹${estimated} ${conf}`
        );
      } else {
        changes.push(
          `  ${v.ram || "?"}/${v.storage || "?"}: ₹${v.price} → ₹${estimated} ${conf}`
        );
      }

      // Calculate originalPrice from the product's typical ratio
      const origPrice = v.originalPrice || Math.round(estimated * patterns.originalPriceRatio);

      return { ...v, price: estimated, originalPrice: origPrice };
    });

    if (fixCount === 0) continue;

    plans.push({ name: product.name, _id: product._id, updatedVariants, changes, fixCount });
  }

  // ── 3. Report ──
  const totalFixCount = plans.reduce((s, p) => s + p.fixCount, 0);

  console.log("═══════════════════════════════════════════════");
  console.log(`  PRODUCTS WITH MISSING VARIANT PRICES`);
  console.log(`  ${plans.length} products to fix (${totalFixCount} total variants)`);
  if (skippedNoReference > 0) {
    console.log(`  ${skippedNoReference} skipped — no priced variants to use as reference`);
  }
  console.log("═══════════════════════════════════════════════\n");

  for (const p of plans) {
    console.log(`📱 ${p.name} (${p.fixCount} fix${p.fixCount !== 1 ? "es" : ""})`);
    for (const change of p.changes) {
      console.log(change);
    }
    console.log();
  }

  console.log("═══════════════════════════════════════════════");
  console.log(`  Total variants to fix:  ${totalFixCount}`);
  console.log(`  Products affected:      ${plans.length}`);
  if (skippedNoReference > 0) {
    console.log(`  Skipped (no reference):  ${skippedNoReference}`);
  }

  if (!APPLY) {
    console.log("\n  ⚠  DRY RUN — no changes written.");
    console.log("  Run with --apply to write fixes to Sanity:");
    console.log(`  npx tsx scripts/fix-missing-variant-prices.ts --apply\n`);
    return;
  }

  // ── 4. Apply mutations ──
  console.log("\n  Writing fixes to Sanity...\n");

  let success = 0;
  let errors = 0;
  for (const plan of plans) {
    process.stdout.write(`  ${plan.name}... `);
    try {
      await mutateSanity([
        {
          patch: {
            id: plan._id,
            set: { variants: plan.updatedVariants },
          },
        },
      ]);
      console.log("✓");
      success++;
    } catch (e: any) {
      console.log(`✗ ${e.message}`);
      errors++;
    }
  }

  console.log();
  console.log("═══════════════════════════════════════════════");
  console.log(`  ✓ ${success} products updated`);
  if (errors) console.log(`  ✗ ${errors} errors`);
  console.log("═══════════════════════════════════════════════\n");

  if (success > 0) {
    console.log("  ✅ Next step: run the audit script to verify:");
    console.log("  npx tsx scripts/check-missing-variant-prices.ts\n");
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
