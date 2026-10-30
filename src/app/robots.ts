import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

const baseUrl = siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Cart/checkout are transient, enquiry-only flows — keep them out.
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
