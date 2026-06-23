import { defineLive } from "next-sanity/live";
import { client } from "@/sanity/client";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({
    apiVersion: "2026-06-23",
  }),
  serverToken: process.env.SANITY_API_READ_TOKEN,
  browserToken: process.env.SANITY_API_READ_TOKEN,
});
