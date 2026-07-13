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

async function mutate(slug: string, ramOptions: string[], storageOptions: string[]): Promise<string> {
  if (dryRun) return "dry-run";
  const res = await fetch(`${BASE_URL}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations: [{ patch: { id: `product-${slug}`, set: { ramOptions, storageOptions } } }] }),
  });
  if (!res.ok) return `error:${res.status}`;
  return "patched";
}

async function main(): Promise<void> {
  const rows = ["slug,status,ramOptions,storageOptions"];
  let failures = 0;

  for (const product of products) {
    const status = await mutate(product.slug, product.ramOptions ?? [], product.storageOptions ?? []);
    if (status.startsWith("error:")) failures += 1;
    rows.push(`${product.slug},${status},${JSON.stringify(product.ramOptions ?? [])},${JSON.stringify(product.storageOptions ?? [])}`);
  }

  writeFileSync("variant-fields-applied.csv", `${rows.join("\n")}\n`);
  console.log(`variant_patch_count=${products.length}`);
  console.log(`variant_patch_failures=${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
