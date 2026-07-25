/**
 * Phase 2 Migration — raw fetch (same pattern as migrate-images-to-sanity.ts)
 * 1. Fix missing _keys
 * 2. Upload local images as Sanity assets
 * 3. Patch products/brands
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = process.env.SANITY_DATASET || "production";
const API_VERSION = "v2024-01-01";
const BASE = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;
const TOKEN = process.env.SANITY_TOKEN || "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fet(url: string, opts: any = {}): Promise<any> {
  const res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
  return res.json();
}

async function retry<T>(fn: () => Promise<T>, label: string, max = 5): Promise<T> {
  for (let i = 0; i < max; i++) {
    try { return await fn(); }
    catch (e: any) {
      const msg = e.message || "";
      const transient = /ECONNRESET|ETIMEDOUT|ECONNREFUSED|timeout|aborted|EAI_AGAIN|fetch failed|network/i.test(msg);
      if (!transient || i >= max - 1) throw e;
      const wait = 1500 * Math.pow(1.8, i);
      console.log(`  ↻ retry ${i + 1}/${max} (${label}): ${msg.slice(0, 70)} in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
  throw new Error("unreachable");
}

async function query<T = any>(q: string): Promise<T[]> {
  const url = `${BASE}/data/query/${DATASET}?query=${encodeURIComponent(q)}`;
  return retry(() => fet(url), "query").then(r => r.result);
}

async function mutate(mutations: any[]): Promise<any> {
  return retry(
    () => fet(`${BASE}/data/mutate/${DATASET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations }),
    }),
    "mutate",
  );
}

function mimeFor(fp: string): string {
  const e = extname(fp).toLowerCase().replace(".", "");
  return ({
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", gif: "image/gif", avif: "image/avif",
  } as Record<string, string>)[e] || "image/png";
}

async function uploadAsset(fp: string): Promise<string> {
  const buf = readFileSync(fp);
  const ct = mimeFor(fp);
  const fn = basename(fp);
  const url = `https://${PROJECT_ID}.api.sanity.io/v2021-06-07/assets/images/${DATASET}?filename=${encodeURIComponent(fn)}`;
  const res = await retry(
    () => fet(url, { method: "POST", headers: { "Content-Type": ct }, body: buf }),
    `upload ${fn}`,
  );
  const id = res?.document?._id;
  if (!id) throw new Error(`no _id for ${fn}`);
  return id;
}

function imgRef(id: string) {
  return { _type: "image", asset: { _type: "reference", _ref: id } };
}

async function fixKeys() {
  console.log("\n🔑 Fixing array _keys…");
  const products = await query<any>(`*[_type=="product"]{_id, colors, variants, specifications, images}`);
  let fixed = 0;
  for (const doc of products) {
    const set: Record<string, any> = {}; let dirty = false;
    for (const field of ["colors", "variants", "specifications", "images"]) {
      const arr: any[] = doc[field];
      if (!Array.isArray(arr)) continue;
      const hasBad = arr.some((i: any) => i && typeof i === "object" && !i._key);
      if (!hasBad) continue;
      set[field] = arr.map((i: any, idx: number) =>
        i && typeof i === "object" && !i._key ? { ...i, _key: `${field[0]}-${doc._id.slice(-8)}-${idx}` } : i
      );
      dirty = true;
    }
    if (dirty) { await mutate([{ patch: { id: doc._id, set } }]); fixed++; process.stdout.write("."); await sleep(100); }
  }
  console.log(`\n✓ Fixed _keys on ${fixed} products\n`);
}

async function migrateImages() {
  console.log("🖼  Uploading product images…\n");
  const prodDir = join(process.cwd(), "public", "images", "products");
  const brandDir = join(process.cwd(), "public", "images", "brand-logos");

  const products = await query<any>(`*[_type=="product"]{_id, "slug": slug.current}`);
  let uploaded = 0, errors = 0;

  for (const doc of products) {
    const slug = doc.slug; if (!slug) continue;
    const folder = join(prodDir, slug); if (!existsSync(folder)) continue;
    const files = readdirSync(folder).filter((f) => /\.(webp|jpe?g|png|gif|avif)$/i.test(f)).sort();
    if (!files.length) continue;

    const ids: string[] = [];
    for (const f of files) {
      try { const aid = await uploadAsset(join(folder, f)); ids.push(aid); await sleep(250); }
      catch (e: any) { console.error(` ✗ ${slug}/${f}: ${e.message.slice(0, 70)}`); errors++; }
    }
    if (!ids.length) continue;
    await mutate([{ patch: { id: doc._id, set: { coverImage: imgRef(ids[0]), images: ids.map(imgRef) } } }]);
    uploaded++; process.stdout.write(".");
    if (uploaded % 10 === 0) await sleep(500);
  }
  console.log(`\n✓ ${uploaded} products (${errors} errors)\n`);

  console.log("🖼  Uploading brand logos…");
  if (!existsSync(brandDir)) return;
  const brands = await query<any>(`*[_type=="brand"]{_id, "slug": slug.current}`);
  let bc = 0;
  for (const doc of brands) {
    const slug = doc.slug?.toLowerCase(); if (!slug) continue;
    const match = readdirSync(brandDir).filter((f) => f.toLowerCase().includes(slug));
    if (!match.length) continue;
    try {
      const aid = await uploadAsset(join(brandDir, match[0]));
      await mutate([{ patch: { id: doc._id, set: { logo: imgRef(aid) } } }]);
      bc++; process.stdout.write("."); await sleep(200);
    } catch (e: any) { console.error(` ✗ brand ${slug}: ${e.message.slice(0, 70)}`); }
  }
  console.log(`\n✓ ${bc} brand logos`);
}

async function main() {
  if (!TOKEN) { console.error("Set SANITY_TOKEN in .env.local"); process.exit(1); }
  console.log(`🎯 ${PROJECT_ID} / ${DATASET}`);
  await fixKeys();
  await migrateImages();
  console.log("\n✅ Done — refresh the Studio.");
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });