import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
