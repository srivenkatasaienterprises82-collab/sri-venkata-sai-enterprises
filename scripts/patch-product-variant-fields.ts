import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { writeFileSync } from "node:fs";
import { products } from "../src/lib/data/products";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const API_VERSION = "v2024-01-01";
const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;
const dryRun = process.argv.includes("--dry-run");
const token = process.env.SANITY_TOKEN;

if (!token) throw new Error("SANITY_TOKEN is required for patch-product-variant-fields.ts");

type StaticVariant = { ram: string; storage: string; price?: number; originalPrice?: number };

function mutateVariants(slug: string, set: Record<string, unknown>): Promise<string> {
  if (dryRun) return Promise.resolve("dry-run");
  return fetch(`${BASE_URL}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations: [{ patch: { id: `product-${slug}`, set } }] }),
  }).then((res) => (res.ok ? "patched" : `error:${res.status}`));
}

// Pull the current Sanity doc so we preserve live scraped prices.
async function fetchSanityVariants(slug: string): Promise<{ ramOptions: string[]; storageOptions: string[]; variants: any[] } | null> {
  const q = `*[_type=="product" && slug.current==${JSON.stringify(slug)}][0]{ "ramOptions": ramOptions, "storageOptions": storageOptions, "variants": variants }`;
  const res = await fetch(`${BASE_URL}/data/query/${DATASET}?query=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { result: any };
  return json.result;
}

function deriveOptions(variants: { ram?: string; storage?: string }[]): { ramOptions: string[]; storageOptions: string[] } {
  const ram = new Set<string>();
  const storage = new Set<string>();
  for (const v of variants) {
    const r = v.ram && v.ram !== "N/A" ? v.ram : "";
    const s = v.storage && v.storage !== "N/A" ? v.storage : "";
    if (r) ram.add(r);
    if (s) storage.add(s);
  }
  return { ramOptions: [...ram], storageOptions: [...storage] };
}

async function main(): Promise<void> {
  const rows = ["slug,status,changed"];
  let failures = 0;
  let changedCount = 0;

  for (const product of products) {
    const staticVariants = product.variants as StaticVariant[];
    if (!staticVariants.length) {
      rows.push(`${product.slug},skipped-no-static-variants,false`);
      continue;
    }

    const sanity = await fetchSanityVariants(product.slug);
    if (!sanity) {
      rows.push(`${product.slug},error-fetch,false`);
      failures += 1;
      continue;
    }
    const sanVariants = sanity.variants || [];
    if (!sanVariants.length) {
      rows.push(`${product.slug},skipped-no-sanity-variants,false`);
      continue;
    }

    // Index-aligned merge: static is the source of truth for ram/storage
    // config; Sanity keeps the live scraped price fields.
    const useIndex = staticVariants.length === sanVariants.length;
    let changed = false;
    const merged = sanVariants.map((v: any, i: number) => {
      const match = useIndex ? staticVariants[i] : staticVariants.find((s) => s.price === v.price) || staticVariants[i];
      if (!match) return v;
      const newRam = match.ram ?? "";
      const newStorage = match.storage ?? "";
      if (v.ram !== newRam || v.storage !== newStorage) changed = true;
      return { ...v, ram: newRam, storage: newStorage };
    });

    const { ramOptions, storageOptions } = deriveOptions(merged);
    const setDoc: Record<string, unknown> = { variants: merged, ramOptions, storageOptions };
    const status = await mutateVariants(product.slug, setDoc);
    if (status.startsWith("error:")) failures += 1;
    if (changed) changedCount += 1;
    rows.push(`${product.slug},${status},${changed}`);
    if (changed) console.log(`  ${product.slug}: corrected ram/storage on ${merged.length} variant(s)`);
  }

  writeFileSync("variant-fields-applied.csv", `${rows.join("\n")}\n`);
  console.log(`variant_patch_count=${products.length}`);
  console.log(`variant_patch_changed=${changedCount}`);
  console.log(`variant_patch_failures=${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
