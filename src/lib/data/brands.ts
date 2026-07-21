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
  { name: "Oppo", slug: "oppo", featured: true, logo: "/images/brand-logos/oppo logo.png" },
  { name: "Vivo", slug: "vivo", featured: true, logo: "/images/brand-logos/vivo logo.png" },
  { name: "Realme", slug: "realme", featured: true, logo: "/images/brand-logos/realme logo.png" },
  { name: "iQOO", slug: "iqoo", featured: true, logo: "/images/brand-logos/iqoo logo.png" },
  { name: "Motorola", slug: "motorola", featured: true, logo: "/images/brand-logos/moto logo.png" },
  { name: "Samsung", slug: "samsung", featured: true, logo: "/images/brand-logos/samsung logo.png" },
  { name: "Apple", slug: "apple", featured: true, logo: "/images/brand-logos/apple logo.png" },
  { name: "Google", slug: "google", featured: true, logo: "/images/brand-logos/google pixel logo.webp" },
  { name: "Redmi", slug: "redmi", featured: true, logo: "/images/brand-logos/redmi logo.png" },
  { name: "Infinix", slug: "infinix", featured: true, logo: "/images/brand-logos/infinix logo.png" },
  { name: "OnePlus", slug: "oneplus", featured: true, logo: "/images/brand-logos/oneplus logo.jpg" },
  { name: "POCO", slug: "poco", featured: true, logo: "/images/brand-logos/poco logo.png" },
  { name: "Narzo", slug: "narzo", featured: true, logo: "/images/brand-logos/narzo logo.png" },
  { name: "HMD", slug: "hmd", featured: false },
  { name: "CMF", slug: "cmf", featured: false },
  { name: "Nothing", slug: "nothing", featured: true, logo: "/images/brand-logos/nothing logo.png" },
  { name: "Jio", slug: "jio", featured: false },
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
