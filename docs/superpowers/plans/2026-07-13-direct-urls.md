# Plan: Add direct marketplace URLs + variants + colors (batch 1)

**Source of truth:** `C:\Users\ramak\Downloads\products_with_direct_urls.csv`
(56 products, 198 variants, direct URLs), `DIRECT_URLS_SUMMARY.md`.
29 pending products in `products_pending_or_failed.csv` are DEFERRED (user will supply later).

## Decisions (confirmed with user)
- **Existing catalog only** — enrich the ~134 products already in `products.ts` + Sanity. No new-product creation.
- URLs are **direct product pages** now (not search links) → price-sync automation can scrape them.
- Keep existing `amazonUrl`/`flipkartUrl` when the CSV lacks one for that product (never lose a good URL).
- `variants[]` are replaced with the CSV's full list (`ram`, `storage`, `price`). Per-variant `amazonUrl`/`flipkartUrl` also carried.
- `colors[]` updated from CSV names, mapped to the existing `C` palette via keyword fallback.

## Data model changes
- `ProductVariant` (products.ts:30): add optional `amazonUrl?: string; flipkartUrl?: string`.
- `SanityProduct.variants` (types.ts:26): add `amazonUrl?; flipkartUrl?`.

## Tasks
1. **Core data pipeline (lead)**
   - `scripts/build-direct-urls-data.ts`: parse CSV → aggregate per product (colorNames, variants[{ram,storage,price,flipkartUrl,amazonUrl,verified}], product-level amazonUrl/flipkartUrl). Name→slug match (normalize); report unmatched. Warn on any `/search` or `/s?k=` URL. Write `src/lib/data/direct-urls-data.ts`.
   - `src/lib/data/direct-urls-overlay.ts`: `applyDirectUrlOverrides(products)` — color name→`C` mapping (keyword fallback + hash), ram/storage normalization ("8 GB"/"256 GB"/"1 TB", "N/A"→""), rebuild `ramOptions`/`storageOptions` from variants, replace `variants[]`, set product-level `amazonUrl`/`flipkartUrl` (csv ?? existing).
   - `products.ts`: import + apply overlay at module load.
   - `scripts/build-direct-urls-data.ts` test (parser + overlay) — TDD.
   - package.json: `direct-urls:build`, `direct-urls:check`.

2. **Sanity mirror (agent)**
   - schema (index.ts:92): add `amazonUrl`/`flipkartUrl` (url) to variant object.
   - `transform.toProduct`: add `amazonUrl: s.amazonUrl, flipkartUrl: s.flipkartUrl` (FIX existing gap).
   - `seed-sanity.ts` `productToSanityDoc`: variants map include `amazonUrl`/`flipkartUrl`.
   - `scripts/patch-direct-urls.ts`: patch amazonUrl/flipkartUrl/colors/variants for the 56 slugs via Sanity HTTP API (reuse pattern from `patch-product-variant-fields.ts` + `getToken`). package.json `direct-urls:patch:sanity`.

3. **Website UI (agent)**
   - `product-detail.tsx`: add Amazon / Flipkart buy buttons. Use selected-variant URL when present, else product-level. `target="_blank" rel="noopener noreferrer"`. Show only when URL exists.

## Verify
- `npx tsc --noEmit` (0), `npm test -- --run` (pass), `npm run lint` (no new errors in touched files vs 60/10 baseline), `npm run build`.
- `npm run direct-urls:check` → matched slugs count, 0 search URLs, 0 unmatched.
- Sanity push is token/network gated → script prepared; user/CI runs `direct-urls:patch:sanity` (or re-seed).
