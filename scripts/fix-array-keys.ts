/**
 * One-time backfill: adds a `_key` to every item in Sanity array fields
 * that were seeded without keys (colors, variants, specifications on products;
 * featuredCarousel, topRatedPerformance, bentoDeals on homePage).
 *
 * Run: npx tsx scripts/fix-array-keys.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = "production";
const API_VERSION = "v2024-01-01";
const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;

function getToken(): string | null {
  return process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN || null;
}

async function sanityQuery(query: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/data/query/${DATASET}?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

async function sanityMutate(mutations: any[]): Promise<any> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`Sanity mutate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function withKeys(arr: any): any {
  if (!Array.isArray(arr)) return arr;
  let changed = false;
  const out = arr.map((item: any, i: number) => {
    if (item && typeof item === "object" && !item._key) {
      changed = true;
      return { ...item, _key: `k${i}-${Math.random().toString(36).slice(2, 9)}` };
    }
    return item;
  });
  return changed ? out : arr;
}

async function fixDoc(_id: string, fields: string[]): Promise<boolean> {
  const proj = fields.map((f) => f).join(", ");
  const doc = await sanityQuery(`*[_id == "${_id}"][0]{${proj}}`);
  if (!doc) return false;

  const set: Record<string, any> = {};
  let needFix = false;
  for (const f of fields) {
    const fixed = withKeys(doc[f]);
    if (fixed !== doc[f]) {
      set[f] = fixed;
      needFix = true;
    }
  }
  if (!needFix) return false;

  await sanityMutate([{ patch: { id: _id, set } }]);
  return true;
}

async function main(): Promise<void> {
  const token = getToken();
  if (!token) {
    console.warn("⚠ No SANITY_TOKEN/SANITY_API_READ_TOKEN found. Set it before running.");
    process.exit(1);
  }

  console.log("Fetching products...");
  const products = await sanityQuery(
    `*[_type == "product"]{_id, colors, variants, specifications}`
  );
  let pFixed = 0;
  for (const p of products) {
    if (await fixDoc(p._id, ["colors", "variants", "specifications"])) {
      pFixed++;
      process.stdout.write(".");
    }
  }
  console.log(`\n✓ Fixed ${pFixed}/${products.length} products`);

  console.log("Fetching homePage...");
  const hFixed = await fixDoc("homePage", [
    "featuredCarousel",
    "topRatedPerformance",
    "bentoDeals",
  ]);
  console.log(hFixed ? "✓ Fixed homePage" : "• homePage already OK / not present");

  console.log("\nDone. Refresh the Studio — 'Missing keys' warnings should be gone.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
