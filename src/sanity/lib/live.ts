import { defineLive } from "next-sanity/live";
import { client } from "@/sanity/client";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({
    apiVersion: "2026-06-23",
  }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});

export async function safeSanityFetch<T>({
  query,
  params,
}: {
  query: string;
  params?: Record<string, any>;
}): Promise<{ data: T | null }> {
  try {
    const res = await sanityFetch({ query, params });
    return res as { data: T };
  } catch (err) {
    console.warn(`⚠️ Sanity fetch error for query ${query}: ${err instanceof Error ? err.message : String(err)}`);
    return { data: null };
  }
}

