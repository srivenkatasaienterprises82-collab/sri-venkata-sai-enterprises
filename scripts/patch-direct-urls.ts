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

if (!token) throw new Error("SANITY_TOKEN is required for patch-direct-urls.ts");

type SetDoc = {
  amazonUrl?: string;
  flipkartUrl?: string;
  colors: { _key: string; name: string; hex: string }[];
  variants: {
    _key: string;
    ram?: string;
    storage?: string;
    price?: number;
    originalPrice?: number;
    amazonUrl?: string;
    flipkartUrl?: string;
  }[];
};

async function mutate(slug: string, doc: SetDoc): Promise<string> {
  if (dryRun) return "dry-run";
  const res = await fetch(`${BASE_URL}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations: [{ patch: { id: `product-${slug}`, set: doc } }] }),
  });
  if (!res.ok) return `error:${res.status}`;
  return "patched";
}

async function main(): Promise<void> {
  const rows = ["slug,status,amazonUrl,flipkartUrl"];
  let count = 0;
  let failures = 0;

  for (const product of products) {
    if (!product.amazonUrl && !product.flipkartUrl) continue;

    const colors = (product.colors ?? []).map((c, i) => ({
      _key: `color-${i}-${c.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || i}`,
      name: c.name,
      hex: c.hex,
    }));

    const variants = product.variants.map((v, i) => ({
      _key: `v-${i}-${v.ram || "na"}-${v.storage || "na"}`,
      ram: v.ram,
      storage: v.storage,
      price: v.price,
      originalPrice: v.originalPrice,
      amazonUrl: v.amazonUrl,
      flipkartUrl: v.flipkartUrl,
    }));

    const setDoc: SetDoc = {
      amazonUrl: product.amazonUrl,
      flipkartUrl: product.flipkartUrl,
      colors,
      variants,
    };

    const status = await mutate(product.slug, setDoc);
    if (status.startsWith("error:")) failures += 1;
    else count += 1;
    rows.push(`${product.slug},${status},${product.amazonUrl ?? ""},${product.flipkartUrl ?? ""}`);
  }

  writeFileSync("direct-urls-applied.csv", `${rows.join("\n")}\n`);
  console.log(`direct_url_patch_count=${count}`);
  console.log(`direct_url_patch_failures=${failures}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
