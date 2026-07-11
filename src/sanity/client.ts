import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  apiVersion: "2026-06-23",
  // Fetch straight from the API (not the CDN) so published edits show immediately.
  useCdn: false,
});
