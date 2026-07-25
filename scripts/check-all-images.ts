/**
 * check-all-images.ts
 *
 * Checks which documents have proper Sanity image objects, string URLs,
 * or are missing images. Uses !defined(field.asset) to detect strings
 * (since only proper objects have .asset).
 *
 * Usage: SANITY_TOKEN=xxx npx tsx scripts/check-all-images.ts
 */

import { createClient } from "@sanity/client";

const TOKEN = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
if (!TOKEN) { console.error("Set SANITY_TOKEN"); process.exit(1); }

const client = createClient({
  projectId: "homvjne9", dataset: "production", token: TOKEN,
  apiVersion: "2024-01-01", useCdn: false,
});

async function count(q: string): Promise<number> {
  return client.fetch(q);
}

async function main() {
  console.log("=== Sanity Image Status Report ===\n");

  const checks = [
    // label, type, field
    ["Products coverImage",  "product",  "coverImage"],
    ["Products images[0]",   "product",  "images[0]" ],
    ["Brands logo",          "brand",    "logo"       ],
    ["Banners image",        "banner",   "image"      ],
    ["Testimonials avatar",  "testimonial", "avatar"  ],
    ["Gallery image",        "gallery",  "image"      ],
    ["Offers image",         "offer",    "image"      ],
    ["Categories image",     "category", "image"      ],
    ["SiteSettings logo",    "siteSettings", "logo"   ],
    ["SiteSettings OG img",  "siteSettings", "openGraphImage"],
  ] as [string, string, string][];

  for (const [label, docType, field] of checks) {
    // Build queries with the type/field inlined to avoid GROQ parameter issues
    const totalQ = `count(*[_type == '${docType}'])`;
    // Has proper Sanity image object: field has .asset
    const objQ   = `count(*[_type == '${docType}' && defined(${field}.asset)])`;
    // Has string (exists but NO .asset → must be a plain string)
    const strQ   = `count(*[_type == '${docType}' && defined(${field}) && !defined(${field}.asset)])`;
    // Missing entirely
    const missQ  = `count(*[_type == '${docType}' && !defined(${field})])`;

    const [total, obj, str, miss] = await Promise.all([
      count(totalQ), count(objQ), count(strQ), count(missQ),
    ]);

    const ok = str === 0 && miss === 0;
    const icon = ok ? "OK" : "!!";
    const pct = total > 0 ? Math.round((obj / total) * 100) : 0;
    console.log(`${icon} ${label.padEnd(32)} ${String(obj).padStart(3)} obj ${String(str).padStart(2)} str ${String(miss).padStart(2)} miss ${String(total).padStart(3)} total ${pct}%`);
  }

  console.log("\n---");
  console.log("obj = Sanity image object (has asset reference)");
  console.log("str = Plain string URL (needs migration / manual reupload)");
  console.log("miss = No image at all (field is null/undefined)");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
