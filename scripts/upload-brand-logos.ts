/**
 * upload-brand-logos.ts
 *
 * Uploads brand logos from local files to Sanity for brands that
 * are missing logos or have string URLs.
 *
 * Usage:
 *   SANITY_TOKEN=xxx npx tsx scripts/upload-brand-logos.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@sanity/client";

const TOKEN = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
if (!TOKEN) { console.error("❌ Set SANITY_TOKEN"); process.exit(1); }

const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  token: TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const LOGOS_DIR = path.join(process.cwd(), "public", "images", "brand-logos");

async function uploadLogo(filePath: string, brandName: string): Promise<string | null> {
  try {
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      webp: "image/webp", avif: "image/avif", gif: "image/gif", svg: "image/svg+xml",
    };
    const asset = await client.assets.upload("image", buffer, {
      contentType: mimeMap[ext] || "image/jpeg",
      filename: `${brandName.toLowerCase().replace(/\s+/g, "-")}-logo.${ext}`,
    });
    return asset._id;
  } catch (err: any) {
    console.warn(`  ⚠ Upload failed for ${filePath}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("🚀 Uploading brand logos to Sanity...\n");

  // Get all brands from Sanity
  const brands: { _id: string; name: string; slug: string; hasLogo: boolean }[] =
    await client.fetch('*[_type=="brand"]{_id,name,"slug":slug.current,"hasLogo":defined(logo.asset)}|order(name asc)');

  // Map of brand slug → local file path
  const slugToFile: Record<string, string> = {};
  const files = fs.readdirSync(LOGOS_DIR);
  for (const file of files) {
    const lower = file.toLowerCase();
    const fullPath = path.join(LOGOS_DIR, file);
    if (!fs.statSync(fullPath).isFile()) continue;

    // Guess slug from filename by removing "logo", "brand", etc.
    let name = lower
      .replace(/ logo\..*$/, "")
      .replace(/ brand\..*$/, "")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

    // Handle known typo: "onplus" → "oneplus"
    if (name === "onplus") name = "oneplus";

    slugToFile[name] = fullPath;
  }

  let uploaded = 0;
  let skipped = 0;
  let noFile = 0;

  for (const brand of brands) {
    if (brand.hasLogo) {
      skipped++;
      continue;
    }

    const filePath = slugToFile[brand.slug];
    if (!filePath) {
      console.log(`❌ ${brand.name} (${brand.slug}) — no logo file found on disk`);
      noFile++;
      continue;
    }

    console.log(`  ↻ Uploading logo for ${brand.name} (${brand.slug})...`);
    const assetId = await uploadLogo(filePath, brand.name);
    if (!assetId) {
      console.log(`  ❌ ${brand.name} — upload failed`);
      noFile++;
      continue;
    }

    // Patch the brand document
    await client.patch(brand._id).set({
      logo: {
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
      },
    }).commit();

    console.log(`  ✅ ${brand.name} — logo uploaded and patched`);
    uploaded++;
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Already had logos: ${skipped}`);
  console.log(`   Still missing (no file): ${noFile}`);
}

main().catch((err) => { console.error("💥", err); process.exit(1); });
