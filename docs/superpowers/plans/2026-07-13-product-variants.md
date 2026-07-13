# Product Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RAM/storage option metadata from `C:\Users\ramak\Downloads\product_variants_colors_ram_storage.md` into the static catalog, Sanity, product detail UI, cart/order flow, and Sanity patch automation without changing price sync behavior.

**Architecture:** The Markdown file is the source of truth. Existing `Product.colors` already stores swatch objects, so preserve that shape and add `ramOptions: string[]` plus `storageOptions: string[]` only. A parser reads the Markdown, scripts apply data to static/Sanity, and the UI uses existing swatches plus new RAM/storage option arrays.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Sanity HTTP API, Node `tsx`, Python `pytest`, GitHub Actions.

---

## File Structure

- Create: `src/lib/data/variant-metadata.ts` — parser helpers, default source path, slug extraction, option splitting.
- Create: `src/lib/data/variant-metadata.test.ts` — parser unit tests using inline Markdown.
- Create: `scripts/check-variant-metadata.ts` — CLI check command, no writes.
- Create: `scripts/apply-variant-metadata.ts` — reads MD and rewrites `src/lib/data/products.ts` with `ramOptions` and `storageOptions`.
- Create: `scripts/patch-product-variant-fields.ts` — patches Sanity fields only.
- Create: `.github/workflows/variant-update.yml` — manual Sanity variant patch workflow.
- Modify: `src/lib/data/products.ts` — add `ramOptions` and `storageOptions` to `Product`; apply values to known products.
- Modify: `src/sanity/schemaTypes/index.ts` — add `ramOptions` and `storageOptions` arrays.
- Modify: `src/sanity/types.ts` — add optional arrays.
- Modify: `src/sanity/queries.ts` — project arrays everywhere products are fetched.
- Modify: `src/sanity/transform.ts` — pass arrays through and fix stock mapping values while touching this file.
- Modify: `scripts/seed-sanity.ts` — include arrays in product docs; require write token for mutation.
- Modify: `src/components/sections/product-detail.tsx` — show storage/RAM selectors from new arrays and include chosen data in checkout link.
- Modify: `src/context/CartContext.tsx` — add optional `variantMeta` and safer hydrate migration.
- Modify: `src/app/checkout/page.tsx` — accept `color`, `ram`, `storage` query params and pass to order form.
- Modify: `src/components/sections/order-form.tsx` — include option metadata in single-product order payload.
- Modify: `src/app/api/orders/route.ts` — validate and print optional RAM/storage/color fields.
- Modify: `.github/workflows/price-sync.yml`, `.github/workflows/launch-check.yml` — add concurrency guards.

## Task 1: Parser Unit Test

**Files:**
- Create: `src/lib/data/variant-metadata.test.ts`
- Create later: `src/lib/data/variant-metadata.ts`

- [ ] **Step 1: Write failing parser tests**

Add `src/lib/data/variant-metadata.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseVariantMetadataMarkdown, splitOptions } from "./variant-metadata";

const sample = `# Product Variants - Colors, RAM & Storage

## Apple

### iPhone 17
- **Price:** Rs 82,900
- **Colors:** Lavender, Sage, Mist Blue, White, Black
- **RAM:** 8 GB LPDDR5X
- **Storage:** 256 GB / 512 GB
- **URL:** /products/iphone-17

### Apple AirPods 4
- **Price:** Rs 17,900
- **Colors:** White (Standard)
- **RAM:** N/A (Audio device)
- **Storage:** N/A (Audio device)
- **URL:** /products/airpods-4
`;

describe("variant metadata parser", () => {
  it("splits option text while dropping N/A values", () => {
    assert.deepEqual(splitOptions("8 GB / 12 GB LPDDR5X"), ["8 GB", "12 GB LPDDR5X"]);
    assert.deepEqual(splitOptions("N/A (Audio device)"), []);
  });

  it("parses product blocks by slug", () => {
    const parsed = parseVariantMetadataMarkdown(sample);

    assert.equal(parsed.items.length, 2);
    assert.deepEqual(parsed.bySlug.get("iphone-17"), {
      brand: "Apple",
      name: "iPhone 17",
      slug: "iphone-17",
      priceText: "Rs 82,900",
      colorNames: ["Lavender", "Sage", "Mist Blue", "White", "Black"],
      ramOptions: ["8 GB LPDDR5X"],
      storageOptions: ["256 GB", "512 GB"],
      url: "/products/iphone-17",
    });
    assert.deepEqual(parsed.bySlug.get("airpods-4")?.ramOptions, []);
    assert.deepEqual(parsed.bySlug.get("airpods-4")?.storageOptions, []);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- --run src/lib/data/variant-metadata.test.ts`

Expected: FAIL with module not found for `./variant-metadata`.

## Task 2: Parser Implementation

**Files:**
- Create: `src/lib/data/variant-metadata.ts`
- Test: `src/lib/data/variant-metadata.test.ts`

- [ ] **Step 1: Add parser implementation**

Create `src/lib/data/variant-metadata.ts`:

```ts
export const DEFAULT_VARIANT_METADATA_PATH =
  "C:\\Users\\ramak\\Downloads\\product_variants_colors_ram_storage.md";

export interface VariantMetadataItem {
  brand: string;
  name: string;
  slug: string;
  priceText: string;
  colorNames: string[];
  ramOptions: string[];
  storageOptions: string[];
  url: string;
}

export interface ParsedVariantMetadata {
  items: VariantMetadataItem[];
  bySlug: Map<string, VariantMetadataItem>;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function splitOptions(value: string): string[] {
  const normalized = clean(value);
  if (!normalized || /^n\/a\b/i.test(normalized)) return [];
  return normalized
    .split(/\s*\/\s*|\s*,\s*/g)
    .map(clean)
    .filter(Boolean)
    .filter((item) => !/^n\/a\b/i.test(item));
}

function readField(block: string, label: string): string {
  const match = block.match(new RegExp(`^- \\*\\*${label}:\\*\\*\\s*(.+)$`, "im"));
  return clean(match?.[1] ?? "");
}

function slugFromUrl(url: string): string {
  const match = url.match(/\/products\/([^/?#\s]+)/);
  return match?.[1] ?? "";
}

export function parseVariantMetadataMarkdown(markdown: string): ParsedVariantMetadata {
  const items: VariantMetadataItem[] = [];
  let currentBrand = "";
  const blocks = markdown.split(/(?=^## |^### )/gm);

  for (const block of blocks) {
    const brandMatch = block.match(/^##\s+(.+)$/m);
    if (brandMatch && !block.match(/^###\s+/m)) {
      currentBrand = clean(brandMatch[1]);
      continue;
    }

    const productMatch = block.match(/^###\s+(.+)$/m);
    if (!productMatch) continue;

    const name = clean(productMatch[1]);
    const priceText = readField(block, "Price");
    const colorsText = readField(block, "Colors");
    const ramText = readField(block, "RAM");
    const storageText = readField(block, "Storage");
    const url = readField(block, "URL");
    const slug = slugFromUrl(url);

    if (!slug) continue;

    items.push({
      brand: currentBrand,
      name,
      slug,
      priceText,
      colorNames: splitOptions(colorsText),
      ramOptions: splitOptions(ramText),
      storageOptions: splitOptions(storageText),
      url,
    });
  }

  return { items, bySlug: new Map(items.map((item) => [item.slug, item])) };
}
```

- [ ] **Step 2: Verify parser tests pass**

Run: `npm test -- --run src/lib/data/variant-metadata.test.ts`

Expected: PASS. The project `npm test` script still discovers all `src/**/*.test.ts` files, so the output includes the existing product and Sanity transform tests plus these 2 parser tests.

- [ ] **Step 3: Commit parser**

```bash
git add src/lib/data/variant-metadata.ts src/lib/data/variant-metadata.test.ts
git commit -m "feat: parse product variant metadata markdown"
```

## Task 3: Metadata Check CLI

**Files:**
- Create: `scripts/check-variant-metadata.ts`
- Modify: `package.json`

- [ ] **Step 1: Add CLI check script**

Create `scripts/check-variant-metadata.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_VARIANT_METADATA_PATH, parseVariantMetadataMarkdown } from "../src/lib/data/variant-metadata";
import { products } from "../src/lib/data/products";

const args = new Set(process.argv.slice(2));
const inputArg = process.argv.find((arg) => arg.startsWith("--in="));
const inputPath = inputArg?.slice("--in=".length) || DEFAULT_VARIANT_METADATA_PATH;
const markdown = readFileSync(inputPath, "utf8");
const parsed = parseVariantMetadataMarkdown(markdown);
const knownSlugs = new Set(products.map((product) => product.slug));
const unknownSlugs = parsed.items.filter((item) => !knownSlugs.has(item.slug));

if (unknownSlugs.length > 0) {
  const csv = ["slug,name,url", ...unknownSlugs.map((item) => `${item.slug},${JSON.stringify(item.name)},${item.url}`)].join("\n");
  writeFileSync("unknown_slugs.csv", `${csv}\n`);
}

console.log(`variant_metadata_count=${parsed.items.length}`);
console.log(`known_count=${parsed.items.length - unknownSlugs.length}`);
console.log(`unknown_count=${unknownSlugs.length}`);

if (args.has("--check") && unknownSlugs.length > 0) {
  process.exitCode = 1;
}
```

- [ ] **Step 2: Add package scripts**

Modify `package.json` scripts:

```json
"variants:check": "tsx scripts/check-variant-metadata.ts --check",
"variants:apply": "tsx scripts/apply-variant-metadata.ts",
"variants:patch:sanity": "tsx scripts/patch-product-variant-fields.ts"
```

- [ ] **Step 3: Run check**

Run: `npm run variants:check`

Expected: command prints `variant_metadata_count=108`. If `unknown_count` is not 0, inspect `unknown_slugs.csv` before continuing.

- [ ] **Step 4: Commit check CLI**

```bash
git add package.json scripts/check-variant-metadata.ts
git commit -m "feat: add variant metadata check command"
```

## Task 4: Static Product Types and Data Apply Script

**Files:**
- Modify: `src/lib/data/products.ts`
- Create: `scripts/apply-variant-metadata.ts`

- [ ] **Step 1: Add product fields**

Modify `Product` in `src/lib/data/products.ts`:

```ts
  colors: ProductColor[];
  ramOptions?: string[];
  storageOptions?: string[];
  variants: ProductVariant[];
```

- [ ] **Step 2: Add apply script**

Create `scripts/apply-variant-metadata.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_VARIANT_METADATA_PATH, parseVariantMetadataMarkdown } from "../src/lib/data/variant-metadata";
import { products } from "../src/lib/data/products";

const sourcePath = process.argv.find((arg) => arg.startsWith("--in="))?.slice("--in=".length) || DEFAULT_VARIANT_METADATA_PATH;
const markdown = readFileSync(sourcePath, "utf8");
const parsed = parseVariantMetadataMarkdown(markdown);
const productSlugs = new Set(products.map((product) => product.slug));
const unknownSlugs = parsed.items.filter((item) => !productSlugs.has(item.slug));

if (unknownSlugs.length > 0) {
  console.error(`Unknown slugs: ${unknownSlugs.map((item) => item.slug).join(", ")}`);
  process.exit(1);
}

let source = readFileSync("src/lib/data/products.ts", "utf8");
let applied = 0;

for (const item of parsed.items) {
  const marker = `slug: "${item.slug}"`;
  const index = source.indexOf(marker);
  if (index === -1) continue;

  const insert = `ramOptions: ${JSON.stringify(item.ramOptions)}, storageOptions: ${JSON.stringify(item.storageOptions)}, `;
  const start = source.lastIndexOf("p({", index);
  const existingRam = source.indexOf("ramOptions:", start);
  const existingStorage = source.indexOf("storageOptions:", start);
  const end = source.indexOf("}),", index);

  if (existingRam !== -1 && existingRam < end) {
    source = source.replace(new RegExp(`ramOptions: \\[[^\\]]*\\], storageOptions: \\[[^\\]]*\\], `), insert);
  } else if (existingStorage === -1 || existingStorage > end) {
    source = source.slice(0, index) + insert + source.slice(index);
  }
  applied += 1;
}

writeFileSync("src/lib/data/products.ts", source);
console.log(`applied_count=${applied}`);
```

- [ ] **Step 3: Run static apply**

Run: `npm run variants:apply`

Expected: `applied_count=108`. If lower, inspect unknown/missing slugs.

- [ ] **Step 4: Run TS product tests**

Run: `npm test -- --run src/lib/data/products.test.ts src/lib/data/variant-metadata.test.ts`

Expected: PASS. The project `npm test` script still discovers all `src/**/*.test.ts` files, so output includes the existing suites as well as the targeted parser file.

- [ ] **Step 5: Commit static data changes**

```bash
git add src/lib/data/products.ts scripts/apply-variant-metadata.ts
git commit -m "feat: add RAM and storage metadata to static products"
```

## Task 5: Sanity Types, Queries, Transform, Seed

**Files:**
- Modify: `src/sanity/schemaTypes/index.ts`
- Modify: `src/sanity/types.ts`
- Modify: `src/sanity/queries.ts`
- Modify: `src/sanity/transform.ts`
- Modify: `scripts/seed-sanity.ts`

- [ ] **Step 1: Add schema fields after colors**

In `src/sanity/schemaTypes/index.ts`, after the `colors` field, add:

```ts
    defineField({ name: "ramOptions", title: "RAM Options", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "storageOptions", title: "Storage Options", type: "array", of: [{ type: "string" }] }),
```

- [ ] **Step 2: Add SanityProduct fields**

In `src/sanity/types.ts`, add after `colors`:

```ts
  ramOptions?: string[];
  storageOptions?: string[];
```

- [ ] **Step 3: Project fields in product GROQ**

In `src/sanity/queries.ts`, every product projection that has `colors, variants` becomes:

```ts
colors, ramOptions, storageOptions, variants
```

Apply to `HOME_PAGE_QUERY`, `PRODUCTS_QUERY`, `FEATURED_PRODUCTS_QUERY`, and `PRODUCT_BY_SLUG_QUERY`.

- [ ] **Step 4: Pass fields through transform and fix stock mapping**

In `src/sanity/transform.ts`, change stock mapping block to:

```ts
  let stockStatus: StockStatus = "inStock";
  if (s.stock === "limited" || s.stock === "pre-order") stockStatus = "limited";
  else if (s.stock === "outOfStock" || s.stock === "out-of-stock") stockStatus = "outOfStock";
```

Then add in returned product after `colors`:

```ts
    ramOptions: s.ramOptions || [],
    storageOptions: s.storageOptions || [],
```

- [ ] **Step 5: Include arrays in seed docs and require write token**

In `scripts/seed-sanity.ts`, replace `getToken` body with:

```ts
function getToken(): string {
  const token = process.env.SANITY_TOKEN;
  if (!token) throw new Error("SANITY_TOKEN is required for Sanity mutations");
  return token;
}
```

In `productToSanityDoc`, add after `colors` block:

```ts
    ramOptions: product.ramOptions ?? [],
    storageOptions: product.storageOptions ?? [],
```

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit Sanity mapping**

```bash
git add src/sanity/schemaTypes/index.ts src/sanity/types.ts src/sanity/queries.ts src/sanity/transform.ts scripts/seed-sanity.ts
git commit -m "feat: mirror variant metadata into Sanity products"
```

## Task 6: Sanity Patch Script and Workflow

**Files:**
- Create: `scripts/patch-product-variant-fields.ts`
- Create: `.github/workflows/variant-update.yml`
- Modify: `.github/workflows/price-sync.yml`
- Modify: `.github/workflows/launch-check.yml`

- [ ] **Step 1: Add patch script**

Create `scripts/patch-product-variant-fields.ts`:

```ts
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
```

- [ ] **Step 2: Add workflow**

Create `.github/workflows/variant-update.yml`:

```yaml
name: Variant Metadata Update

on:
  workflow_dispatch:

concurrency:
  group: variant-update
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run variants:patch:sanity
        env:
          NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_SANITY_PROJECT_ID }}
          NEXT_PUBLIC_SANITY_DATASET: production
          SANITY_TOKEN: ${{ secrets.SANITY_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: variant-fields-applied
          path: variant-fields-applied.csv
```

- [ ] **Step 3: Add workflow concurrency guards**

Add this block near top of `.github/workflows/price-sync.yml`:

```yaml
concurrency:
  group: price-sync
  cancel-in-progress: false
```

Add this block near top of `.github/workflows/launch-check.yml`:

```yaml
concurrency:
  group: launch-check
  cancel-in-progress: false
```

- [ ] **Step 4: Run dry-run locally**

Run: `npm run variants:patch:sanity -- --dry-run`

Expected: `variant_patch_count=` equals total static products and `variant_patch_failures=0`.

- [ ] **Step 5: Commit script/workflow**

```bash
git add scripts/patch-product-variant-fields.ts .github/workflows/variant-update.yml .github/workflows/price-sync.yml .github/workflows/launch-check.yml
git commit -m "feat: patch product variant metadata into Sanity"
```

## Task 7: Product Detail UI and Checkout Link

**Files:**
- Modify: `src/components/sections/product-detail.tsx`

- [ ] **Step 1: Add RAM/storage state**

In `ProductDetail`, after current `useState` calls, add:

```ts
  const [activeRam, setActiveRam] = useState(product.ramOptions?.[0] ?? product.variants[0]?.ram ?? "");
  const [activeStorage, setActiveStorage] = useState(product.storageOptions?.[0] ?? product.variants[0]?.storage ?? "");
```

Then replace `displayPrice` with:

```ts
  const matchingVariant = product.variants.find((variant) => variant.ram === activeRam && variant.storage === activeStorage);
  const displayPrice = matchingVariant?.price ?? activeVariant?.price ?? product.price;
  const displayOriginalPrice = matchingVariant?.originalPrice ?? activeVariant?.originalPrice ?? product.originalPrice;
```

- [ ] **Step 2: Replace combined storage selector with separate selectors**

Replace the `Storage & RAM` block with:

```tsx
              {(product.ramOptions?.length || product.storageOptions?.length || product.variants.length) ? (
                <div className="mb-10 space-y-6">
                  {product.ramOptions?.length ? (
                    <div>
                      <p className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">RAM</p>
                      <div className="flex flex-wrap gap-3">
                        {product.ramOptions.map((ram) => (
                          <button
                            key={ram}
                            onClick={() => setActiveRam(ram)}
                            className={`rounded-2xl border-2 px-5 py-3 text-sm font-bold transition-all ${activeRam === ram ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          >
                            {ram}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {product.storageOptions?.length ? (
                    <div>
                      <p className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">Storage</p>
                      <div className="flex flex-wrap gap-3">
                        {product.storageOptions.map((storage) => (
                          <button
                            key={storage}
                            onClick={() => setActiveStorage(storage)}
                            className={`rounded-2xl border-2 px-5 py-3 text-sm font-bold transition-all ${activeStorage === storage ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          >
                            {storage}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
```

- [ ] **Step 3: Include variant query metadata**

Change checkout link `href` to:

```tsx
href={`/checkout?product=${product.slug}&ram=${encodeURIComponent(activeRam)}&storage=${encodeURIComponent(activeStorage)}&color=${encodeURIComponent(activeColor?.name ?? "")}`}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit PDP UI**

```bash
git add src/components/sections/product-detail.tsx
git commit -m "feat: show RAM and storage selectors on product detail"
```

## Task 8: Cart and Order Metadata Wiring

**Files:**
- Modify: `src/context/CartContext.tsx`
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/components/sections/order-form.tsx`
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Extend CartItem**

In `src/context/CartContext.tsx`, add:

```ts
  variantMeta?: { color?: string; ram?: string; storage?: string };
```

Keep existing `ram`, `storage`, and `colorName` for compatibility.

- [ ] **Step 2: Pass checkout query metadata**

In `src/app/checkout/page.tsx`, read query params:

```ts
  const color = typeof params.color === "string" ? params.color : undefined;
  const ram = typeof params.ram === "string" ? params.ram : undefined;
  const storage = typeof params.storage === "string" ? params.storage : undefined;
```

Pass to `OrderForm`:

```tsx
<OrderForm productId={productId} variant={variant} color={color} ram={ram} storage={storage} />
```

- [ ] **Step 3: Update OrderForm props and payload**

In `src/components/sections/order-form.tsx`, extend props:

```ts
export function OrderForm({ productId, variant, color, ram, storage }: { productId: string; variant?: string; color?: string; ram?: string; storage?: string }) {
```

In the submit payload for a single product, include:

```ts
selectedColor: color ?? "",
selectedRam: ram ?? "",
selectedStorage: storage ?? variant ?? "",
```

- [ ] **Step 4: Extend API types and WhatsApp message**

In `src/app/api/orders/route.ts`, add `selectedRam?: string;` to `OrderPayload` and `OrderItem`.

In `validateOrder`, allow optional RAM:

```ts
(entry.selectedRam === undefined || typeof entry.selectedRam === "string") &&
```

In `buildWhatsAppMessage`, print RAM before storage:

```ts
if (item.selectedRam) lines.push(` RAM: ${item.selectedRam}`);
```

For single product:

```ts
if (order.selectedRam) lines.push(`RAM: ${order.selectedRam}`);
```

- [ ] **Step 5: Verify TS tests**

Run: `npm test -- --run`

Expected: all TS tests pass.

- [ ] **Step 6: Commit order wiring**

```bash
git add src/context/CartContext.tsx src/app/checkout/page.tsx src/components/sections/order-form.tsx src/app/api/orders/route.ts
git commit -m "feat: carry variant metadata through checkout orders"
```

## Task 9: Automation Compatibility Test

**Files:**
- Modify: `tests/test_launch_checker.py`

- [ ] **Step 1: Add Python regression test**

Add this test near existing launch checker tests:

```py
def test_launch_checker_ignores_variant_metadata(monkeypatch):
    import launch_checker

    product = {
        "name": "Test Phone",
        "slug": {"current": "test-phone"},
        "amazonUrl": "https://example.com/a",
        "flipkartUrl": "https://example.com/f",
        "price": 10000,
        "colors": [{"name": "Black", "hex": "#000000"}],
        "ramOptions": ["8 GB"],
        "storageOptions": ["128 GB"],
    }

    monkeypatch.setattr(launch_checker, "fetch_products", lambda: [product])
    monkeypatch.setattr(launch_checker, "update_price", lambda *args, **kwargs: True)
    monkeypatch.setattr(launch_checker, "get_price_from_url", lambda url: 9999)

    result = launch_checker.sync_prices(dry_run=True)
    assert result["checked"] == 1
```

- [ ] **Step 2: Run focused pytest**

Run: `pytest tests/test_launch_checker.py -q`

Expected: all tests in file pass.

- [ ] **Step 3: Commit automation test**

```bash
git add tests/test_launch_checker.py
git commit -m "test: keep price sync compatible with variant metadata"
```

## Task 10: Final Verification

**Files:** all touched files.

- [ ] **Step 1: Run parser/check command**

Run: `npm run variants:check`

Expected: `variant_metadata_count=108`, `unknown_count=0`.

- [ ] **Step 2: Run TypeScript tests**

Run: `npm test -- --run`

Expected: all TS tests pass.

- [ ] **Step 3: Run Python tests**

Run: `pytest`

Expected: 61+ tests pass after new test.

- [ ] **Step 4: Run TypeScript compiler**

Run: `npx tsc --noEmit`

Expected: exit 0, no output.

- [ ] **Step 5: Run production build**

Run: `npm run build`

Expected: Next build completes.

- [ ] **Step 6: Run lint baseline**

Run: `npm run lint`

Expected: existing lint may fail; compare count to previous baseline of 60 errors / 10 warnings. Do not introduce new lint errors in touched files if avoidable.

- [ ] **Step 7: Review diff**

Run: `git diff --stat` and `git diff -- src/lib/data/products.ts src/components/sections/product-detail.tsx scripts/patch-product-variant-fields.ts`

Expected: only planned files changed; no secrets printed or added.

- [ ] **Step 8: Final commit**

```bash
git status --short
git add .
git commit -m "feat: add product RAM and storage metadata"
```

## Self-Review Notes

- Spec coverage: parser, static data, Sanity schema/query/transform/seed, patch workflow, frontend selection, cart/order metadata, automation compatibility, and verification are covered.
- Type correction: original spec asked for `colors: string[]`, but existing project already uses `colors: ProductColor[]`; this plan keeps `colors` as swatches and adds `ramOptions`/`storageOptions` only.
- No per-variant pricing: base/variant price behavior stays existing; price sync remains unchanged.
