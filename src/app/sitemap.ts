import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/data/products";
import { getAllBrands } from "@/lib/data/brands";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://srivenkatasaienterprises.com";

// Static landing pages that should be indexed.
const staticRoutes: MetadataRoute.Sitemap = [
  { url: "/", changeFrequency: "daily", priority: 1 },
  { url: "/products", changeFrequency: "daily", priority: 0.9 },
  { url: "/about", changeFrequency: "monthly", priority: 0.5 },
  { url: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { url: "/shipping-policy", changeFrequency: "yearly", priority: 0.3 },
  { url: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { url: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { url: "/best-mobile-store-in-ongole", changeFrequency: "monthly", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const brandRoutes: MetadataRoute.Sitemap = getAllBrands().map((brand) => ({
    url: `/category/${brand.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productRoutes: MetadataRoute.Sitemap = getAllProducts().map((product) => ({
    url: `/products/${product.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...brandRoutes, ...productRoutes].map((route) => ({
    ...route,
    url: `${baseUrl}${route.url}`,
    lastModified: route.lastModified ?? now,
  }));
}
