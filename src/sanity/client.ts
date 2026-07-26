import { createClient } from "next-sanity";

/**
 * Storefront client — published content only.
 *
 * Drafts in Studio (yellow "unpublished" state) never appear on the website.
 * Owner must click Publish for customers to see changes.
 * useCdn: false so price/content updates show without waiting on CDN lag.
 *
 * The read token (SANITY_API_READ_TOKEN) is required if the dataset is
 * configured as private. It is optional for public datasets. On the browser
 * side the env var is undefined — that is safe because the client is only
 * used for server-side fetches (sanityFetchNoCache). The image-url builder
 * (@sanity/image-url) does not need a token.
 */
export const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  apiVersion: "2026-06-23",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_READ_TOKEN,
});
