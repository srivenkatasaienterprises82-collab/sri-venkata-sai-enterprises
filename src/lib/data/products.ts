/**
 * Product types and display helpers for the storefront.
 *
 * Products are NOT stored here: the owner manages them in Sanity Studio
 * (src/sanity/queries.ts is the only source). This module is shared, pure
 * formatting logic plus the `Product` shape that Sanity documents are mapped
 * onto by src/sanity/transform.ts.
 */

export type ProductCategory =
  | "new-arrival"
  | "best-seller"
  | "deal"
  | "flagship"
  | "budget"
  | "accessory";

export type ProductType =
  | "smartphone"
  | "tablet"
  | "earbuds"
  | "accessory"
  | "feature-phone"
  | "router";

export type StockStatus = "inStock" | "limited" | "outOfStock";

export interface ProductVariant {
  ram: string;
  storage: string;
  /** Price in INR. Omit (undefined) when price is on enquiry only. */
  price?: number;
  originalPrice?: number;
  /** Per-variant Amazon-specific price (when available). */
  amazonPrice?: number;
  /** Per-variant Flipkart-specific price (when available). */
  flipkartPrice?: number;
  amazonUrl?: string;
  flipkartUrl?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  /** Folder name under /public/images/products/. */
  imageFolder: string;
  type: ProductType;
  category: ProductCategory;
  stock: StockStatus;
  /** Cover image. */
  image: string;
  description: string;
  colors: ProductColor[];
  variants: ProductVariant[];
  specifications: { label: string; value: string }[];
  featured: boolean;
  tags: string[];
  price?: number;
  originalPrice?: number;
  /** When true, price is hidden — enquiry only. */
  priceOnEnquiry?: boolean;
  /** Live Flipkart price written by the 6h price-sync (authoritative storefront price). */
  flipkartPrice?: number;
  /** Live Amazon price written by the 6h price-sync (only when an amazonUrl exists). */
  amazonPrice?: number;
  amazonUrl?: string;
  flipkartUrl?: string;
  /** Legacy: derived from variants.ram / variants.storage */
  ramOptions?: string[];
  storageOptions?: string[];
}

/**
 * The static demo catalogue has been removed. Products now live only in
 * Sanity (project homvjne9, dataset production); the storefront reads them
 * from there and shows nothing when there are none.
 *
 * This array stays empty so the remaining one-off catalogue tooling in
 * `scripts/` still type-checks. Nothing in the app reads it.
 */
export const products: Product[] = [];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByBrand(brandSlug: string): Product[] {
  return products.filter((p) => p.brandSlug === brandSlug.toLowerCase());
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category);
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.category === "best-seller");
}

export function getNewArrivals(): Product[] {
  return products.filter((p) => p.category === "new-arrival");
}

export function getDeals(): Product[] {
  return products.filter((p) => p.category === "deal");
}

export function getFlagshipProducts(): Product[] {
  return products.filter((p) => p.category === "flagship");
}

export function getStartingPrice(product: Product): number | undefined {
  // Prefer live marketplace prices (per-variant, then product-level) so the
  // displayed "from" price reflects the real Flipkart/Amazon price, never the
  // stale seed `price`.
  const marketPrices = product.variants
    .flatMap((v) => [v.flipkartPrice, v.amazonPrice])
    .filter((pr): pr is number => typeof pr === "number" && pr > 0);
  if (marketPrices.length) return Math.min(...marketPrices);
  if (typeof product.flipkartPrice === "number" && product.flipkartPrice > 0) return product.flipkartPrice;
  if (typeof product.amazonPrice === "number" && product.amazonPrice > 0) return product.amazonPrice;
  const seedPrices = product.variants
    .map((v) => v.price)
    .filter((pr): pr is number => typeof pr === "number");
  if (seedPrices.length) return Math.min(...seedPrices);
  return product.price;
}

// The authoritative selling price shown on the storefront is the live
// Flipkart price (the 6h price-sync writes `flipkartPrice` on every
// Flipkart-sourced product). We never show a competing Amazon price for
// Flipkart products — only the single Flipkart price.
export function getFlipkartPrice(
  product: Product,
  ram?: string | null,
  storage?: string | null,
): number | undefined {
  // Prefer the selected variant's Flipkart price when one is chosen.
  if (ram || storage) {
    const mv = product.variants.find(
      (v) => (v.ram ?? "") === (ram ?? "") && (v.storage ?? "") === (storage ?? ""),
    );
    if (mv?.flipkartPrice) return mv.flipkartPrice;
  }
  if (typeof product.flipkartPrice === "number") return product.flipkartPrice;
  // Fall back to the cheapest variant Flipkart price, then any variant price.
  const fkVariants = product.variants
    .map((v) => v.flipkartPrice)
    .filter((pr): pr is number => typeof pr === "number");
  if (fkVariants.length) return Math.min(...fkVariants);
  return getStartingPrice(product);
}

export function isPriceOnEnquiry(product: Product): boolean {
  return Boolean(product.priceOnEnquiry) || getStartingPrice(product) === undefined;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getVariantByKey(
  product: Product,
  ram: string,
  storage: string
): ProductVariant | undefined {
  return product.variants.find((v) => v.ram === ram && v.storage === storage);
}

export function getProductsByType(type: Product["type"]): Product[] {
  return products.filter((p) => p.type === type);
}
