import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "8shdnlxt",
  dataset: "production",
  apiVersion: "2026-06-23",
  useCdn: true,
});
