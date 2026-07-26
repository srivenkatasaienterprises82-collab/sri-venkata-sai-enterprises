import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  apiVersion: "2026-06-23",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_READ_TOKEN,
});

import { defineLive } from "next-sanity/live";

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});

export async function sanityFetchNoCache<T>({
  query,
  params,
}: {
  query: string;
  params?: Record<string, any>;
}): Promise<{ data: T | null; tags: string[] }> {
  try {
    const result = await client.fetch<T>(query, params ?? {}, {
      next: { revalidate: 0 },
      useCdn: false,
      perspective: "published",
    });
    const data =
      result && typeof result === "object" && "result" in (result as any)
        ? (result as any).result
        : result;
    return { data: data as unknown as T, tags: [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "development") {
      console.error(`Sanity fetch error:`, err);
    } else {
      console.warn(`Sanity fetch error: ${msg}`);
    }
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
  const { data } = await sanityFetchNoCache<T>({ query, params });
  return { data };
}
