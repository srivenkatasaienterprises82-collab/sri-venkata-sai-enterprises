/**
 * fix-string-images.ts
 *
 * One-time migration: converts all string-typed image fields in Sanity
 * documents into proper Sanity image asset references.
 *
 * The Python automation (sanity_api.py) stored images as plain URL strings
 * (both external URLs like https://i.ibb.co/... and local paths like
 * /images/products/...). The Studio needs native image objects to show the
 * upload / replace UI.
 *
 * This script:
 *  1. Fetches all documents with string image fields.
 *  2. For each string value, uploads the image to Sanity as an asset.
 *  3. Patches the document to replace the string with {_type:"image", asset:{_ref:"...",_type:"reference"}}.
 *
 * Usage:
 *   SANITY_TOKEN=... npx tsx scripts/fix-string-images.ts
 *   (or set SANITY_TOKEN in .env.local)
 *
 * Flags:
 *   --dry-run    Only print what would be done; no uploads or mutations.
 *   --type       Limit to a specific document type (product, brand, banner, etc.)
 */

/**
 * fix-string-images.ts
 *
 * NOTE: This script does NOT need `dotenv`. Next.js auto-loads `.env.local`
 * when running via `npx tsx` from the project root. If you're running from
 * a different working directory, make sure SANITY_TOKEN is set explicitly:
 *   SANITY_TOKEN=xxx npx tsx scripts/fix-string-images.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@sanity/client";

// ── Config ──────────────────────────────────────────────────────────────
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_TO_TYPE = (() => {
  const idx = process.argv.indexOf("--type");
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

if (!TOKEN) {
  console.error("❌ Set SANITY_TOKEN or SANITY_API_READ_TOKEN in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fields that may contain string images per document type
const IMAGE_FIELDS: Record<string, string[]> = {
  product: ["coverImage", "images"],
  brand: ["logo"],
  category: ["image"],
  banner: ["image"],
  testimonial: ["avatar"],
  gallery: ["image"],
  offer: ["image"],
  siteSettings: ["logo", "openGraphImage"],
};

// ── Helpers ─────────────────────────────────────────────────────────────

function isStringImage(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0 && !val.startsWith("data:");
}

function isLocalPath(val: string): boolean {
  return val.startsWith("/images/") || val.startsWith("public/images/");
}

function isExternalUrl(val: string): boolean {
  return val.startsWith("http://") || val.startsWith("https://");
}

function isAlreadyImageObject(val: unknown): boolean {
  return (
    typeof val === "object" &&
    val !== null &&
    (val as any)._type === "image" &&
    (val as any).asset?._ref
  );
}

function mimeTypeFromUrl(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    svg: "image/svg+xml",
  };
  return map[ext] || "image/jpeg";
}

// ── Upload ──────────────────────────────────────────────────────────────

async function uploadFromUrl(
  imageUrl: string,
  sourceLabel: string,
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  try {
    const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) {
      console.warn(`  ⚠ Failed to download ${sourceLabel}: HTTP ${resp.status}`);
      return null;
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    const ctype = resp.headers.get("content-type") || mimeTypeFromUrl(imageUrl);
    const filename = path.basename(new URL(imageUrl).pathname) || "image.jpg";

    const asset = await client.assets.upload("image", buffer, {
      contentType: ctype,
      filename,
    });

    return {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
    };
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      console.warn(`  ⚠ Timeout downloading ${sourceLabel}`);
    } else {
      console.warn(`  ⚠ Error uploading ${sourceLabel}: ${err.message}`);
    }
    return null;
  }
}

async function uploadFromLocalFile(
  filePath: string,
  sourceLabel: string,
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  try {
    // Resolve to absolute path relative to project root
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath.replace(/^\//, ""));

    if (!fs.existsSync(abs)) {
      console.warn(`  ⚠ File not found: ${abs}`);
      return null;
    }

    const buffer = fs.readFileSync(abs);
    const filename = path.basename(abs);
    const ext = path.extname(abs).toLowerCase().replace(".", "");
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
    };
    const ctype = mimeMap[ext] || "image/jpeg";

    const asset = await client.assets.upload("image", buffer, {
      contentType: ctype,
      filename,
    });

    return {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
    };
  } catch (err: any) {
    console.warn(`  ⚠ Error uploading ${sourceLabel}: ${err.message}`);
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 fix-string-images.ts — ${DRY_RUN ? "DRY RUN" : "LIVE RUN"}`);
  console.log(`   Project: ${PROJECT_ID} / ${DATASET}`);
  console.log("");

  const typesToProcess = LIMIT_TO_TYPE
    ? [LIMIT_TO_TYPE]
    : Object.keys(IMAGE_FIELDS);

  let totalPatched = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const docType of typesToProcess) {
    const fields = IMAGE_FIELDS[docType];
    if (!fields) {
      console.warn(`  ⚠ Unknown doc type "${docType}", skipping.`);
      continue;
    }

    console.log(`\n📦 Processing "${docType}" documents...`);

    // Build projection to fetch only _id and image fields
    const projection = ["_id", ...fields].join(", ");
    const docs: any[] = await client.fetch(
      `*[_type == "${docType}"]{${projection}}`,
    );

    console.log(`   Found ${docs.length} documents.`);

    for (const doc of docs) {
      const patches: Record<string, any> = {};

      for (const field of fields) {
        const val = doc[field];

        // Already a proper Sanity image → skip
        if (isAlreadyImageObject(val)) continue;

        // Sanity array field (like product.images)
        if (Array.isArray(val)) {
          const newArray: any[] = [];
          let changed = false;
          for (const item of val) {
            if (isAlreadyImageObject(item)) {
              newArray.push(item);
            } else if (isStringImage(item)) {
              changed = true;
              const uploaded = await uploadImageValue(item, `${doc._id}.${field}[${newArray.length}]`, docType);
              if (uploaded) {
                newArray.push(uploaded);
              } else {
                // Keep original if upload failed
                newArray.push(item);
              }
            } else {
              newArray.push(item);
            }
            await sleep(100); // Rate limit
          }
          if (changed) patches[field] = newArray;
          continue;
        }

        // Single string value
        if (isStringImage(val)) {
          const uploaded = await uploadImageValue(val, `${doc._id}.${field}`, docType);
          if (uploaded) patches[field] = uploaded;
          await sleep(100);
          continue;
        }

        // Empty / null / undefined → keep as-is
      }

      if (Object.keys(patches).length === 0) {
        totalSkipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`   [DRY] Would patch ${doc._id}: ${Object.keys(patches).join(", ")}`);
        totalPatched++;
        continue;
      }

      try {
        await client.patch(doc._id).set(patches).commit();
        console.log(`   ✅ ${doc._id}: patched ${Object.keys(patches).join(", ")}`);
        totalPatched++;
      } catch (err: any) {
        console.error(`   ❌ ${doc._id}: mutation failed — ${err.message}`);
        totalErrors++;
      }

      // Rate limiting: small delay between mutations
      await sleep(200);
    }
  }

  // Also handle siteSettings as singleton
  if (!LIMIT_TO_TYPE || LIMIT_TO_TYPE === "siteSettings") {
    console.log(`\n📦 Processing "siteSettings" (singleton)...`);
    const ssDoc: any = await client.fetch(
      `*[_id == "siteSettings"][0]{_id, logo, openGraphImage}`,
    );

    if (ssDoc) {
      const patches: Record<string, any> = {};
      for (const field of ["logo", "openGraphImage"] as const) {
        const val = ssDoc[field];
        if (isStringImage(val)) {
          const uploaded = await uploadImageValue(val, `siteSettings.${field}`, "siteSettings");
          if (uploaded) patches[field] = uploaded;
          await sleep(100);
        }
      }

      if (Object.keys(patches).length > 0) {
        if (DRY_RUN) {
          console.log(`   [DRY] Would patch siteSettings: ${Object.keys(patches).join(", ")}`);
          totalPatched++;
        } else {
          try {
            await client.patch("siteSettings").set(patches).commit();
            console.log(`   ✅ siteSettings: patched ${Object.keys(patches).join(", ")}`);
            totalPatched++;
          } catch (err: any) {
            console.error(`   ❌ siteSettings: mutation failed — ${err.message}`);
            totalErrors++;
          }
        }
      } else {
        totalSkipped++;
      }
    }
  }

  // ── Summary ──
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log(`   Patched: ${totalPatched}`);
  console.log(`   Skipped (already image objects): ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  if (DRY_RUN) {
    console.log("\n   ⚠ DRY RUN — no data was changed.");
    console.log('   Run without --dry-run to apply: npx tsx scripts/fix-string-images.ts');
  }
}

/**
 * Upload a single image value (URL or local path) to Sanity.
 */
async function uploadImageValue(
  value: string,
  label: string,
  docType: string,
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  const trimmed = value.trim();

  if (isExternalUrl(trimmed)) {
    console.log(`   ↻ Downloading ${label}: ${trimmed.slice(0, 60)}...`);
    return uploadFromUrl(trimmed, label);
  }

  if (isLocalPath(trimmed)) {
    // Prepend "public/" to the path — Sanity stores paths like
    // "/images/products/..." but the actual files live under
    // "public/images/products/..." relative to the project root.
    const localPath = trimmed.startsWith("/")
      ? `public${trimmed}`
      : `public/${trimmed}`;
    console.log(`   ↻ Reading local ${label}: ${localPath}`);
    return uploadFromLocalFile(localPath, label);
  }

  // Skip placeholders / unknown formats
  if (/placeholder|undefined|null/i.test(trimmed)) {
    return null;
  }

  console.warn(`   ⚠ ${label}: unrecognized image format (${trimmed.slice(0, 60)}), skipping.`);
  return null;
}

main().catch((err) => {
  console.error("💥 Fatal:", err);
  process.exit(1);
});
