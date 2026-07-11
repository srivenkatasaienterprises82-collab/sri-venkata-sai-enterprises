/**
 * One-time migration: uploads all existing image URLs/paths currently stored
 * as strings into Sanity's image assets, and replaces the string fields with
 * native image references. After this runs, the Studio image fields become
 * true upload fields.
 *
 * Run: npx tsx scripts/migrate-images-to-sanity.ts
 *
 * Images that cannot be fetched (missing local files) are left as-is (the
 * frontend resolver still renders string paths), and reported at the end.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = "production";
const API_VERSION = "v2021-06-07";
const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;
const SITE_BASE = "https://www.srivenkatasaienterprises.com";

function getToken(): string {
  const t = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
  if (!t) throw new Error("Set SANITY_TOKEN in .env.local");
  return t;
}
const TOKEN = getToken();

async function sanityQuery(query: string): Promise<any> {
  const res = await fetch(`${BASE_URL.replace(API_VERSION, "v2024-01-01")}/data/query/${DATASET}?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`query failed ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

async function sanityMutate(mutations: any[]): Promise<any> {
  const res = await fetch(`${BASE_URL.replace(API_VERSION, "v2024-01-01")}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`mutate failed ${res.status} ${await res.text()}`);
  return res.json();
}

const failed: string[] = [];

function toAbsolute(urlOrPath: string): string {
  const v = (urlOrPath || "").trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return `${SITE_BASE}${v}`;
  return v;
}

async function uploadImage(value: string): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  const url = toAbsolute(value);
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    const ext = (url.split("?")[0].split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ctype = resp.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const filename = (url.split("/").pop() || "image").split("?")[0] || "image.jpg";
    const up = await fetch(
      `${BASE_URL}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": ctype },
        body: buf,
      }
    );
    if (!up.ok) throw new Error(`upload HTTP ${up.status} ${await up.text()}`);
    const json = await up.json();
    const ref = json?.document?._id;
    if (!ref) throw new Error("no _id in upload response");
    return { _type: "image", asset: { _type: "reference", _ref: ref } };
  } catch (e: any) {
    failed.push(`${value} -> ${e.message}`);
    return null;
  }
}

async function migrateField(_id: string, field: string, value: any): Promise<boolean> {
  if (typeof value !== "string" || !value.trim()) return false;
  if (value.startsWith("http") && value.includes("cdn.sanity.io")) return false; // already an asset URL
  const img = await uploadImage(value);
  if (!img) return false;
  await sanityMutate([{ patch: { id: _id, set: { [field]: img } } }]);
  return true;
}

async function migrateArrayField(_id: string, field: string, arr: any[]): Promise<boolean> {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  let changed = false;
  const next = [];
  for (const item of arr) {
    if (item && typeof item === "object" && item._type === "image") {
      next.push(item);
      continue;
    }
    if (typeof item === "string" && item.trim()) {
      const img = await uploadImage(item);
      if (img) {
        next.push(img);
        changed = true;
        continue;
      }
    }
    next.push(item); // keep as-is if upload failed
  }
  if (!changed) return false;
  await sanityMutate([{ patch: { id: _id, set: { [field]: next } } }]);
  return true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("=== Products (coverImage + images) ===");
  const products = await sanityQuery(`*[_type == "product"]{_id, coverImage, images}`);
  let pc = 0;
  for (const p of products) {
    let did = false;
    if (await migrateField(p._id, "coverImage", p.coverImage)) did = true;
    if (await migrateArrayField(p._id, "images", p.images || [])) did = true;
    if (did) { pc++; process.stdout.write("."); }
    await sleep(120);
  }
  console.log(`\n✓ ${pc}/${products.length} products migrated`);

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
      if (await migrateField(d._id, field, d[field])) { c++; process.stdout.write("."); }
      await sleep(120);
    }
    console.log(`\n✓ ${c}/${docs.length} ${type} migrated`);
  }

  console.log(`\n=== Site Settings (logo, openGraphImage) ===`);
  const s = await sanityQuery(`*[_id == "siteSettings"][0]{_id, logo, openGraphImage}`);
  if (s) {
    let did = false;
    if (await migrateField(s._id, "logo", s.logo)) did = true;
    if (await migrateField(s._id, "openGraphImage", s.openGraphImage)) did = true;
    console.log(did ? "✓ siteSettings migrated" : "• siteSettings unchanged");
  }

  console.log("\n=== DONE ===");
  if (failed.length) {
    console.log(`\n⚠ ${failed.length} images could NOT be uploaded (left as string paths):`);
    failed.slice(0, 40).forEach((f) => console.log("  - " + f));
    if (failed.length > 40) console.log(`  ...and ${failed.length - 40} more`);
    console.log("\nThese are likely missing local files. Re-add them in the Studio (Upload button) or give the developer the files.");
  } else {
    console.log("All images migrated successfully.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
