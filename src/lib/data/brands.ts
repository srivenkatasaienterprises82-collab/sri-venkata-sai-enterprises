export interface Brand {
  name: string;
  slug: string;
  /** Featured brands are shown in the brand carousel & footer. */
  featured: boolean;
  /** Optional logo path under /brand-logos. */
  logo?: string;
}

/**
 * Every brand must:
 *  - have a `slug` that matches the `brandSlug` used in products.ts
 *  - be listed here so the filter / brand pages resolve correctly
 */
export const brands: Brand[] = [
  // Brands ordered as requested by the client
  { name: "Oppo", slug: "oppo", featured: true, logo: "/brand-logos/oppo logo.png" },
  { name: "Vivo", slug: "vivo", featured: true, logo: "/brand-logos/vivo logo.png" },
  { name: "Realme", slug: "realme", featured: true, logo: "/brand-logos/realme logo.png" },
  { name: "iQOO", slug: "iqoo", featured: true, logo: "/brand-logos/iqoo logo.png" },
  { name: "Motorola", slug: "motorola", featured: true, logo: "/brand-logos/motorola logo.png" },
  { name: "Samsung", slug: "samsung", featured: true, logo: "/brand-logos/samsung logo.png" },
  { name: "Apple", slug: "apple", featured: true, logo: "/brand-logos/apple logo.png" },
  { name: "Google", slug: "google", featured: true, logo: "/brand-logos/google pixel logo.webp" },
  { name: "CMF", slug: "cmf", featured: true, logo: "/brand-logos/nothing logo.png" },
  { name: "Redmi", slug: "redmi", featured: true, logo: "/brand-logos/redmi logo.png" },
  { name: "Infinix", slug: "infinix", featured: true },
  { name: "OnePlus", slug: "oneplus", featured: true, logo: "/brand-logos/oneplus logo.jpg" },
  { name: "POCO", slug: "poco", featured: true, logo: "/brand-logos/poco logo.png" },
  { name: "Narzo", slug: "narzo", featured: true, logo: "/brand-logos/narzo logo.png" },
  { name: "AI+", slug: "ai-plus", featured: false },
  { name: "Coolpad", slug: "coolpad", featured: false },
  { name: "HMD", slug: "hmd", featured: false },
  { name: "Itel", slug: "itel", featured: false },
  { name: "Jio", slug: "jio", featured: false },
  { name: "Lava", slug: "lava", featured: false },
  { name: "Peace", slug: "peace", featured: false },
  { name: "Snexian", slug: "snexian", featured: false },
];

export function getAllBrands(): Brand[] {
  return brands;
}

export function getFeaturedBrands(): Brand[] {
  return brands.filter((b) => b.featured);
}

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug.toLowerCase());
}
