# Product Variants — Colors, RAM, Storage

**Date:** 2026-07-13
**Status:** Approved
**Author:** opencode (brainstorm)

## Goal

Add colour, RAM, and storage variant metadata for all 108 products listed in
`C:\Users\ramak\Downloads\product_variants_colors_ram_storage.md`. Persist into
the static product catalog and Sanity CMS. Do not change price sync behaviour.

## Source of Truth

The Markdown file is canonical. The static catalog (`src/lib/data/products.ts`)
and Sanity both mirror it. Amazon/Flipkart scrapers continue to be used only
for live price verification against existing URLs.

## Out of Scope

- Per-(RAM × storage × colour) variant pricing (deferred).
- Automatic variant discovery via Amazon/Flipkart scraper parsers (deferred).
- Colour-to-image mapping per variant (deferred).
- Replacement of the existing `variants[]` field; we add new fields alongside.

## Data Shape

Add top-level optional fields to the static `Product` interface and the Sanity
product schema:

```ts
colors: string[];         // ["Lavender", "Sage", ...]
ramOptions: string[];     // ["8 GB", "12 GB", ...]
storageOptions: string[]; // ["128 GB", "256 GB", ...]
```

A product entry can include `N/A` strings in the source file (e.g. AirPods).
The parser maps those to empty arrays.

Matching: each MD entry has a local URL like `/products/<slug>`. The slug is
the existing `Product.id`. The MD file contains 108 products; 14 brands.

## Markdown Parser

New script `scripts/parse-variants-md.ts`:

- Reads the file path passed as `--in` argument.
- Splits on `### Product` headings; for each block, captures a 5-field list:
  Price, Colors, RAM, Storage, URL.
- Reuses existing logic for "Rs X,XXX" parsing used in seed scripts.
- Emits a typed `VariantInfo` per slug.
- Returns `unknownSlugs: string[]` for any slug not present in
  `src/lib/data/products.ts`.
- `--check` mode exits non-zero on unknown slugs; default mode logs them.

Unit tests: one brand section, asserts counts and that empty `N/A` arrays are
emitted as `[]`.

## Static Catalog Update

A `scripts/apply-variants-to-static.mjs` (or `.ts`) script:

1. Calls the parser.
2. For each known slug: merges `colors`, `ramOptions`, `storageOptions` into
   the static export. Writes `src/lib/data/products.ts` atomically (formats
   with `prettier --write` after generation).
3. Leaves existing field order intact (manual diff review).
4. Logs `applied_count`, `skipped_count` (with reason), `unknown_slug_count`.

Existing tests (`src/lib/data/products.test.ts`) still pass. No new tests
required for static catalog; parser tests cover correctness.

## Sanity Schema

`src/sanity/schemaTypes/index.ts`:

```ts
defineField({ name: "colors", type: "array", of: [{ type: "string" }] })
defineField({ name: "ramOptions", type: "array", of: [{ type: "string" }] })
defineField({ name: "storageOptions", type: "array", of: [{ type: "string" }] })
```

Add to the product type object, alphabetically:

```ts
import { defineType, defineField } from "sanity";
```

## Sanity Mapping & Seed

`scripts/seed-sanity.ts` — `productToSanityDoc` includes the three new arrays
directly from the static product.

`src/sanity/types.ts` — add `colors?: string[]`, `ramOptions?: string[]`,
`storageOptions?: string[]`.

`src/sanity/transform.ts` — propagate the three fields to the UI-shape
`Product` (no field renaming).

## Sanity Update Path (incremental, no full re-seed)

New script `scripts/patch-product-variant-fields.ts`:

- Reads each known slug, builds a mutation that *only* touches the three new
  fields (and `_updatedAt` is allowed to drift).
- Uses `SANITY_TOKEN` (Editor token); aborts if missing.
- Writes `variant-fields-applied.csv` with `{ slug, status }`.
- Exits non-zero if any mutation fails.
- `--dry-run` supported.

## Frontend Behaviour

`src/components/sections/product-detail.tsx`:

- Show `colors` as swatches.
- Show `ramOptions` + `storageOptions` as pill selectors.
- When user changes selection: store as component state (`selectedColor`,
  `selectedRam`, `selectedStorage`). No URL change yet.
- If a matching `variants[]` entry exists for the selection: use its price.
- Otherwise: use the product base price.
- Display "Price on Enquiry" if `product.priceOnEnquiry === true`.

`src/context/CartContext.tsx`:

- Cart item gains `variantMeta?: { color?: string; ram?: string; storage?: string }`.
- Existing cart migration: items without `variantMeta` keep their previous
  behaviour; new items include the meta.

`src/app/checkout/page.tsx`, `src/app/api/orders/route.ts`:

- Submit JSON now carries the same `variantMeta` per line item. Validation
  treats the fields as optional strings.

## Price Automation Behaviour

Unchanged. `automation/launch_checker.py` already operates on URLs in
`products.ts`; the new fields do not affect price scraping.

A lightweight post-change test verifies:

- `pytest` still passes (>= 60 tests).
- One new test asserts the launch checker does not crash when product fields
  contain `colors`/`ramOptions`/`storageOptions` (proves parser resilience).

## Workflow Hardening

`.github/workflows/price-sync.yml` and `.github/workflows/launch-check.yml`:

- Add `concurrency:` groups so a manual re-run does not collide with a
  scheduled run.
- Pin key actions to immutable SHAs (current `@v4` / `@v5` references to be
  hardened in a separate security task; this spec mentions but does not fix).

A new workflow `.github/workflows/variant-update.yml`:

- Manual `workflow_dispatch` only.
- Runs `scripts/patch-product-variant-fields.ts`, uploads
  `variant-fields-applied.csv` and `unknown_slugs.csv` (if produced).
- concurrency group `variant-update`.

## Verification

Performed sequentially before any claim of completion:

| Command | Expected |
|---|---|
| `npx tsc --noEmit` | exit 0, no output |
| `npm test -- --run` | 15/15 (or more) pass |
| `pytest` | 60+ pass |
| `npm run build` | Next build OK |
| `npx tsx scripts/parse-variants-md.ts --check` | exit 0, 108 known |
| `npx tsx scripts/patch-product-variant-fields.ts --dry-run` | exit 0, CSV preview |
| `npx tsx scripts/patch-product-variant-fields.ts` (dry-run scorched) | exit 0, applied.csv = 108 |
| `npm run lint` | Same baseline as before (no new errors) |

## Failure Modes

- Missing `SANITY_TOKEN`: script aborts with clear message.
- Unknown slug in MD: parser emits `unknown_slugs.csv`, fails `--check`.
- Race with price sync: separate `concurrency` group enforced.
- Empty `colors` array rendering: swatch row hidden when length is 0 (no
  empty row markup).

## Risks

- **Schema drift**: existing products in Sanity without the new fields cause
  no failure because all fields are optional. UI tolerates empty arrays.
- **Order API trust**: not changed in this spec. The order API still trusts
  client-submitted totals per the project-level review. Addressed separately.
- **Lint regressions**: any new `any` types must follow the existing standard;
  the structured pattern already uses typed arrays.

## Rollout

1. Add parser + tests (TDD: failing test first).
2. Apply to static catalog.
3. Update Sanity schema types and `src/sanity/transform.ts`.
4. Update seeded products (idempotent).
5. Add patch script + workflow.
6. Frontend PDP + cart + checkout wiring.
7. Run all verification commands.
8. Commit and push; trigger Vercel redeploy (manual in repo for this spec).
