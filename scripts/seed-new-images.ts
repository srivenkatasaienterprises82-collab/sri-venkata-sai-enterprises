/**
 * Seed newly-provided product images into Sanity.
 * 1. Copies each source image into public/images/products/<slug>/ (renamed, no spaces).
 * 2. Uploads all images in that folder to Sanity and sets:
 *      coverImage = the designated primary image
 *      images     = every image in the folder (old + new, so the gallery grows)
 *
 * Run: node_modules/.bin/tsx scripts/seed-new-images.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = "production";
const API_VERSION = "v2021-06-07";
const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;
const TOKEN = (process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN)!;

const SRC1 = "C:\\Users\\ramak\\Downloads\\drive-download-20260711T050705Z-2-001";
const SRC2 = "C:\\Users\\ramak\\Downloads\\drive-download-20260711T050754Z-2-001";

type Item = { src: string; dest: string; primary?: boolean };

const MAP: Record<string, Item[]> = {
  "iphone-17": [{ src: path.join(SRC1, "17.jpeg"), dest: "17.jpeg", primary: true }],
  "iphone-17-air": [{ src: path.join(SRC1, "17 Air.jpeg"), dest: "17-air.jpeg", primary: true }],
  "iphone-17-pro": [
    { src: path.join(SRC1, "17 pro.jpeg"), dest: "17-pro.jpeg", primary: true },
    { src: path.join(SRC1, "17 pro blue.jpeg"), dest: "17-pro-blue.jpeg" },
    { src: path.join(SRC1, "17 pro sliver.jpeg"), dest: "17-pro-silver.jpeg" },
  ],
  "iphone-17-pro-max": [{ src: path.join(SRC1, "17 pro max.jpg"), dest: "17-pro-max.jpg", primary: true }],
  "oppo-k13x": [{ src: path.join(SRC1, "k13x.jpg"), dest: "k13x.jpg", primary: true }],
  "samsung-s25-fe": [{ src: path.join(SRC1, "s25 fe white.webp"), dest: "s25-fe-white.webp", primary: true }],
  "moto-edge-60-pro": [{ src: path.join(SRC2, "edge 60 pro.png"), dest: "edge-60-pro.png", primary: true }],
  "moto-edge-70-pro": [{ src: path.join(SRC2, "edge 70 pro.png"), dest: "edge-70-pro.png", primary: true }],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ctypeFor(fp: string): string {
  const ext = fp.split(".").pop()!.toLowerCase();
  return (
    { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" } as Record<string, string>
  )[ext] || "image/jpeg";
}

async function uploadLocalFile(fp: string): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  const buf = fs.readFileSync(fp);
  const ctype = ctypeFor(fp);
  const filename = path.basename(fp);
  const res = await fetch(`${BASE_URL}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": ctype },
    body: buf,
  });
  if (!res.ok) {
    console.error(`  upload failed ${res.status} for ${fp}`);
    return null;
  }
  const json = await res.json();
  const ref = json?.document?._id;
  if (!ref) return null;
  return { _type: "image", asset: { _type: "reference", _ref: ref } };
}

async function sanityMutate(mutations: any[]): Promise<void> {
  const res = await fetch(`${BASE_URL.replace(API_VERSION, "v2024-01-01")}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`mutate failed ${res.status} ${await res.text()}`);
}

async function main() {
  for (const [slug, items] of Object.entries(MAP)) {
    const folder = path.join("public", "images", "products", slug);
    fs.mkdirSync(folder, { recursive: true });

    // 1. copy source files in (renamed, spaces removed)
    for (const it of items) {
      fs.copyFileSync(it.src, path.join(folder, it.dest));
      console.log(`copied -> public/images/products/${slug}/${it.dest}`);
    }

    // 2. upload every image in the folder (old + new)
    const allFiles = fs
      .readdirSync(folder)
      .filter((f) => /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f))
      .sort()
      .map((f) => path.join(folder, f));

    const assets: { file: string; asset: any }[] = [];
    for (const f of allFiles) {
      const a = await uploadLocalFile(f);
      if (a) assets.push({ file: f, asset: a });
      await sleep(60);
    }

    // 3. primary = designated new image; fall back to first uploaded
    const primaryItem = items.find((i) => i.primary)!;
    const primaryPath = path.join(folder, primaryItem.dest);
    const primaryAsset = assets.find((x) => x.file === primaryPath)?.asset;
    const cover = primaryAsset || assets[0]?.asset;

    const imgs = assets.map((x) => x.asset);
    await sanityMutate([{ patch: { id: `product-${slug}`, set: { coverImage: cover, images: imgs } } }]);
    console.log(`✓ ${slug}: cover=${path.basename(primaryPath)}, images=${imgs.length}`);
    await sleep(60);
  }
  console.log("\nDONE");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
