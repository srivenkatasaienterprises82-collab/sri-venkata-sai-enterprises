import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/data/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.storeName,
    short_name: siteConfig.storeShortName,
    description: `${siteConfig.tagline} — genuine smartphones, EMI options, exchange offers, and local service in ${siteConfig.address.city}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.jpg", sizes: "192x192", type: "image/jpeg" },
      { src: "/icon.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
  };
}
