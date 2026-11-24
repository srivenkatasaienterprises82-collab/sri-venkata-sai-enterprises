import type { MetadataRoute } from "next";
import { getAllBrands } from "@/lib/data/brands";
import { siteUrl } from "@/lib/siteUrl";
import { safeSanityFetch } from "@/sanity/lib/live";
import { PRODUCT_SLUGS_QUERY } from "@/sanity/queries";

const baseUrl = siteUrl;

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const brandRoutes: MetadataRoute.Sitemap = getAllBrands().map((brand) => ({
    url: `/category/${brand.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Product URLs come from Sanity only: listing a deleted or never-published
  // product would point Google at a 404.
  const { data: productSlugs } = await safeSanityFetch<{ slug: string }[]>({
    query: PRODUCT_SLUGS_QUERY,
  });
  const productRoutes: MetadataRoute.Sitemap = (productSlugs ?? [])
    .filter((entry) => entry?.slug)
    .map((entry) => ({
      url: `/products/${entry.slug}`,
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
