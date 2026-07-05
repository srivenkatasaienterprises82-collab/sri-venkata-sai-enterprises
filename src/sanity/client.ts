import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  apiVersion: "2026-06-23",
  useCdn: true,
});
