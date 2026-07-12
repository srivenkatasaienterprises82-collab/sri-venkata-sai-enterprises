import { defineLive } from "next-sanity/live";
import { client } from "@/sanity/client";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({
    apiVersion: "2026-06-23",
  }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});

/**
 * Cache-bypassing Sanity fetch for **price-sensitive** server renders.
 *
 * Why this exists:
 * `defineLive().sanityFetch` wraps the underlying HTTP call with
 * `next: { revalidate: false, tags: [...] }`. That means the result is
 * cached indefinitely by the Next.js Data Cache and only invalidated via
 * `revalidateTag` callbacks fired by `<SanityLive />`. `<SanityLive />`
 * however is mounted only in draft mode (see src/app/layout.tsx), so in
 * normal production traffic the cached response is never evicted between
 * deploys. This produced a real bug: the product listing page rendered the
 * fresh post-sync price (it was forced to re-render and the cache happened
 * to have been evicted by a prior request) while the product detail page
 * kept returning the older cached document.
 *
 * To guarantee the storefront always shows the price that lives in Sanity,
 * we use the underlying `client.fetch` with `cache: 'no-store'` for every
 * server fetch whose result feeds a price display. Pages that use this
 * helper must (and do) opt out of static generation via
 * `export const dynamic = "force-dynamic"`.
 *
 * `sanityFetch`/`SanityLive` remain in place for draft-mode live preview.
 */
export async function sanityFetchNoCache<T>({
  query,
  params,
}: {
  query: string;
  params?: Record<string, any>;
}): Promise<{ data: T | null; tags: string[] }> {
  try {
    const result = await client.fetch<T>(query, params ?? {}, {
      // `filterResponse: false` matches the contract callers expect
      // (next-sanity's sanityFetch returns the full envelope).
      filterResponse: false,
      // Bypass the Next.js Data Cache and the full request cache.
      // This makes every render hit the Sanity Content Lake.
      next: { revalidate: 0 },
      cache: "no-store" as any,
      perspective: "published",
      // Pull from the API, not the CDN edge. The Sanity CDN can lag the
      // Content Lake by a few seconds after a `mutation`, which matters
      // right after the price-sync GitHub Action runs.
      useCdn: false,
    } as any);
    return { data: result as unknown as T, tags: [] };
  } catch (err) {
    console.warn(`⚠️ Sanity fetch (no-cache) error for query ${query}: ${err instanceof Error ? err.message : String(err)}`);
    return { data: null, tags: [] };
  }
}

export async function safeSanityFetch<T>({
  query,
  params,
}: {
  query: string;
  params?: Record<string, any>;
}): Promise<{ data: T | null }> {
  // Use the cache-bypassing helper for catalogue reads so price updates
  // are visible without waiting for the Next.js fetch cache to expire.
  const { data } = await sanityFetchNoCache<T>({ query, params });
  return { data };
}

