import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import https from "node:https";
import { deflateSync } from "node:zlib";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = process.env.SANITY_DATASET || "production";
const TOKEN = process.env.SANITY_TOKEN || "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function req(path: string, body?: Buffer, method = "GET", ct?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://${PROJECT_ID}.api.sanity.io/v2024-01-01${path}`);
    const opts: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, ...(ct ? { "Content-Type": ct } : {}) },
    };
    const r = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode && res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        try { return resolve(JSON.parse(raw)); } catch { return resolve(raw); }
      });
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

async function groq(q: string) {
  const u = `/data/query/${DATASET}?query=${encodeURIComponent(q)}`;
  const r: any = await req(u, undefined, "GET");
  return r.result ?? r;
}

async function mutate(mutations: any[]) {
  const body = Buffer.from(JSON.stringify({ mutations }));
  return req(`/data/mutate/${DATASET}`, body, "POST", "application/json");
}

function mimeFor(fp: string) {
  const e = extname(fp).toLowerCase().replace(".", "");
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif" } as any)[e] || "image/png";
}

async function uploadAsset(fp: string): Promise<string> {
  const buf = readFileSync(fp);
  const ct = mimeFor(fp);
  const fn = basename(fp);
  const u = `/v2021-06-07/assets/images/${DATASET}?filename=${encodeURIComponent(fn)}`;
  const res: any = await new Promise((resolve, reject) => {
    const url = new URL(`https://${PROJECT_ID}.api.sanity.io${u}`);
    const opts: https.RequestOptions = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": ct },
    };
    const r = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode && res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
        try { return resolve(JSON.parse(raw)); } catch { return resolve(raw); }
      });
    });
    r.on("error", reject);
    r.write(buf);
    r.end();
  });
  const id = res?.document?._id;
  if (!id) throw new Error(`no _id for ${fn}`);
  return id;
}

function imgRef(id: string) {
  return { _type: "image", asset: { _type: "reference", _ref: id } };
}

async function retry<T>(fn: () => Promise<T>, label: string, max = 5): Promise<T> {
  for (let i = 0; i < max; i++) {
    try { return await fn(); } catch (e: any) {
      const m = e.message || "";
      const t = /ECONNRESET|ETIMEDOUT|ECONNREFUSED|timeout|aborted|EAI_AGAIN|fetch failed|network/i.test(m);
      if (!t || i >= max - 1) throw e;
      const w = 1500 * Math.pow(1.8, i);
      process.stdout.write(`\n  ↻ retry ${i + 1}/${max} ${label} in ${Math.round(w)}ms`);
      await sleep(w);
    }
  }
  throw new Error("unreachable");
}

const W = () => process.stdout.write(".");
const E = (s: string) => process.stderr.write(`\n ✗ ${s}`);

async function main() {
  if (!TOKEN) { console.error("missing SANITY_TOKEN"); process.exit(1); }
  console.log(`🎯 ${PROJECT_ID} / ${DATASET}`);
  console.log("🖼 uploading product images…");

  const products = await groq(`*[_type=="product"]{_id,"slug":slug.current}`);
  const prodDir = join(process.cwd(), "public", "images", "products");
  const brandDir = join(process.cwd(), "public", "images", "brand-logos");
  let ok = 0, err = 0;

  for (const doc of products) {
    const slug = doc.slug; if (!slug) continue;
    const folder = join(prodDir, slug); if (!existsSync(folder)) continue;
    const files = readdirSync(folder).filter((f) => /\.(webp|jpe?g|png|gif|avif)$/i.test(f)).sort();
    if (!files.length) continue;

    const ids: string[] = [];
    for (const f of files) {
      const fp = join(folder, f);
      const st = statSync(fp).size;
      if (st === 61) { ids.push("SKIP"); break; }
      try {
        const aid = await retry(() => uploadAsset(fp), slug + "/" + f);
        ids.push(aid);
        await sleep(120);
      } catch (e: any) { E(`${slug}/${f}: ${e.message.slice(0, 120)}`); err++; }
    }
    if (!ids.length || (ids.length === 1 && ids[0] === "SKIP")) { W(); continue; }
    try {
      await mutate([{ patch: { id: doc._id, set: { coverImage: imgRef(ids[0]), images: ids.filter((x) => x !== "SKIP").map(imgRef) } } }]);
      ok++; W();
    } catch (e: any) { E(`patch ${slug}: ${e.message.slice(0, 120)}`); err++; }
  }
  console.log(`\n✓ products ${ok} / ${err} errors`);

  if (!existsSync(brandDir)) return;
  console.log("🖼 uploading brand logos…");
  const brands = await groq(`*[_type=="brand"]{_id,"slug":slug.current}`);
  let bc = 0;
  for (const doc of brands) {
    const slug = (doc.slug as string)?.toLowerCase();
    if (!slug) continue;
    const match = readdirSync(brandDir).filter((f) => f.toLowerCase().includes(slug));
    if (!match.length) continue;
    try {
      const aid = await retry(() => uploadAsset(join(brandDir, match[0])), "brand/" + slug);
      await mutate([{ patch: { id: doc._id, set: { logo: imgRef(aid) } } }]);
      bc++; W(); await sleep(120);
    } catch (e: any) { E(`brand ${slug}: ${e.message.slice(0, 120)}`); }
  }
  console.log(`\n✓ brand logos ${bc}`);
  console.log("done");
}

main().catch((e) => { console.error("\nFatal:", e.message); process.exit(1); });