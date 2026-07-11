/**
 * One-time migration: uploads all existing product images from the local
 * `public/images` folder into Sanity's image assets and replaces the string /
 * broken-ref image fields with native image references.
 *
 * The live site is too flaky to download from, so images are read straight
 * from disk. Placeholder / empty image fields are skipped — the client can add
 * those later via the Studio Upload button.
 *
 * Run: node_modules/.bin/tsx scripts/migrate-images-to-sanity.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = "production";
const API_VERSION = "v2021-06-07";
const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;

function getToken(): string {
  const t = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
  if (!t) throw new Error("Set SANITY_TOKEN in .env.local");
  return t;
}
const TOKEN = getToken();

const PROGRESS = path.join(process.cwd(), "migrate-progress.log");
fs.writeFileSync(PROGRESS, `start ${new Date().toISOString()}\n`);
function prog(s: string) {
  fs.appendFileSync(PROGRESS, s + "\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(url: string, opts: any = {}, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 6): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = `${e?.message || ""} ${e?.cause?.code || e?.cause?.message || ""}`;
      const transient = /ENOTFOUND|fetch failed|ETIMEDOUT|ECONNRESET|ECONNREFUSED|timeout|aborted|EAI_AGAIN/i.test(msg);
      if (!transient) throw e;
      process.stderr.write(`\n  ↻ retry ${i + 1}/${tries} (${label}): ${msg.trim().slice(0, 80)}\n`);
      await sleep(700 * (i + 1));
    }
  }
  throw lastErr;
}

async function sanityQuery(query: string): Promise<any> {
  const res = await withRetry(
    () => fetchWithTimeout(`${BASE_URL.replace(API_VERSION, "v2024-01-01")}/data/query/${DATASET}?query=${encodeURIComponent(query)}`),
    "query"
  );
  if (!res.ok) throw new Error(`query failed ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

async function sanityMutate(mutations: any[]): Promise<any> {
  const res = await withRetry(
    () =>
      fetchWithTimeout(`${BASE_URL.replace(API_VERSION, "v2024-01-01")}/data/mutate/${DATASET}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ mutations }),
      }),
    "mutate"
  );
  if (!res.ok) throw new Error(`mutate failed ${res.status} ${await res.text()}`);
  return res.json();
}

const failed: string[] = [];

function imgFilesIn(folder: string): string[] {
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder)
    .filter((f) => /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f))
    .sort()
    .map((f) => path.join(folder, f));
}

function ctypeFor(fp: string): string {
  const ext = fp.split(".").pop()!.toLowerCase();
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      bmp: "image/bmp",
    } as Record<string, string>
  )[ext] || "image/jpeg";
}

async function uploadLocalFile(fp: string): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  try {
    const buf = fs.readFileSync(fp);
    const ctype = ctypeFor(fp);
    const filename = path.basename(fp);
    const up = await withRetry(
      () =>
        fetchWithTimeout(`${BASE_URL}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": ctype },
          body: buf,
        }),
      "upload",
      4
    );
    if (!up.ok) throw new Error(`upload HTTP ${up.status}`);
    const json = await up.json();
    const ref = json?.document?._id;
    if (!ref) throw new Error("no _id in upload response");
    return { _type: "image", asset: { _type: "reference", _ref: ref } };
  } catch (e: any) {
    failed.push(`${fp} -> ${e.message}`);
    return null;
  }
}

// Skip strings that are placeholders (never real images).
function isRealLocalImage(v: any): boolean {
  if (typeof v !== "string" || !v.trim()) return false;
  if (/placeholder/i.test(v)) return false;
  return v.startsWith("/images/");
}

// Resolve a stored "/images/..." string to a local file, falling back to the
// first real image in that folder when the exact filename doesn't exist.
function localPathFor(value: string): string | null {
  const rel = value.trim().replace(/^\//, "");
  const exact = path.join("public", rel);
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) return exact;
  const folder = path.dirname(exact);
  const f = imgFilesIn(folder)[0];
  return f || null;
}

async function main() {
  console.log("=== Products (upload from public/images/products) ===");
  const products = await sanityQuery(`*[_type == "product"]{_id, coverImage, "slug": slug.current}`);
  let pc = 0;
  for (const p of products) {
    const slug = p.slug || p._id.replace(/^product-/, "");
    // Skip products that already have a valid object cover (already migrated).
    if (p.coverImage && p.coverImage._type === "image") {
      prog(`${slug}: skip (already image)`);
      continue;
    }
    const folder = path.join("public", "images", "products", slug);
    const files = imgFilesIn(folder);
    if (!files.length) {
      prog(`${slug}: SKIP no local folder`);
      process.stderr.write(`\n  ! no local images for ${slug} — skipped (add via Studio)\n`);
      continue;
    }

    const cover = await uploadLocalFile(files[0]);
    const imgs: any[] = [];
    for (const f of files) {
      const im = await uploadLocalFile(f);
      if (im) imgs.push(im);
    }
    if (cover || imgs.length) {
      const set: Record<string, any> = {};
      if (cover) set.coverImage = cover;
      if (imgs.length) set.images = imgs;
      try {
        await sanityMutate([{ patch: { id: p._id, set } }]);
        pc++;
        prog(`${slug}: OK (cover=${!!cover}, imgs=${imgs.length})`);
        process.stdout.write(".");
      } catch (e: any) {
        prog(`${slug}: MUTATE-FAIL ${e.message}`);
      }
    } else {
      prog(`${slug}: UPLOAD-FAIL`);
    }
    await sleep(40);
  }
  console.log(`\n✓ ${pc}/${products.length} products uploaded`);

  for (const [type, field] of [
    ["brand", "logo"],
    ["category", "image"],
    ["banner", "image"],
    ["testimonial", "avatar"],
    ["gallery", "image"],
    ["offer", "image"],
  ] as const) {
    console.log(`\n=== ${type} (${field}) ===`);
    const docs = await sanityQuery(`*[_type == "${type}"]{_id, ${field}}`);
    let c = 0;
    for (const d of docs) {
      if (!isRealLocalImage(d[field])) continue;
      const fp = localPathFor(d[field]);
      if (!fp) continue;
      const im = await uploadLocalFile(fp);
      if (im) {
        await sanityMutate([{ patch: { id: d._id, set: { [field]: im } } }]);
        c++;
        process.stdout.write(".");
      }
      await sleep(80);
    }
    console.log(`\n✓ ${c}/${docs.length} ${type} migrated`);
  }

  console.log(`\n=== Site Settings (logo, openGraphImage) ===`);
  const s = await sanityQuery(`*[_id == "siteSettings"][0]{_id, logo, openGraphImage}`);
  if (s) {
    const patches: Record<string, any> = {};
    for (const f of ["logo", "openGraphImage"] as const) {
      if (isRealLocalImage(s[f])) {
        const fp = localPathFor(s[f]);
        if (fp) {
          const im = await uploadLocalFile(fp);
          if (im) patches[f] = im;
        }
      }
    }
    if (Object.keys(patches).length) {
      await sanityMutate([{ patch: { id: s._id, set: patches } }]);
      console.log("✓ siteSettings migrated");
    } else {
      console.log("• siteSettings unchanged");
    }
  }

  console.log("\n=== DONE ===");
  if (failed.length) {
    console.log(`\n⚠ ${failed.length} images could NOT be uploaded:`);
    failed.slice(0, 40).forEach((f) => console.log("  - " + f));
    if (failed.length > 40) console.log(`  ...and ${failed.length - 40} more`);
  } else {
    console.log("All available local images migrated successfully.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
