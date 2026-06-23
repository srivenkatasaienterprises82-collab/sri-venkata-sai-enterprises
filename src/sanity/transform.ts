import type { Product, ProductVariant, ProductColor } from "@/lib/data/products";
import type { Testimonial } from "@/lib/data/testimonials";
import type { Brand } from "@/lib/data/brands";
import type { SanityProduct, SanityCategory, SanityTestimonial } from "./types";

export function toProduct(s: SanityProduct): Product {
  return {
    id: s._id,
    name: s.name,
    slug: s.slug?.current || "",
    brand: s.brand?.name || "",
    brandSlug: s.brandSlug || "",
    imageFolder: "",
    type: "smartphone",
    category: "best-seller",
    stock: s.stock > 0 ? "inStock" : "outOfStock",
    image: s.coverImage || "",
    description: s.description || "",
    colors: (s.colors || []) as ProductColor[],
    variants: (s.variants || []) as ProductVariant[],
    specifications: [],
    featured: s.featured || false,
    tags: [],
    priceOnEnquiry: s.priceOnEnquiry || false,
  };
}

export function toProducts(data: SanityProduct[]): Product[] {
  return data.map(toProduct);
}

export function toTestimonial(s: SanityTestimonial): Testimonial {
  return {
    name: s.name,
    location: "",
    rating: s.rating,
    text: s.quote,
    source: "manual",
  };
}

export function toTestimonials(data: SanityTestimonial[]): Testimonial[] {
  return data.map(toTestimonial);
}

export function toBrand(s: SanityCategory): Brand {
  return {
    name: s.name,
    slug: s.slug?.current || "",
    logo: s.logo || "",
    featured: true,
  };
}

export function toBrands(data: SanityCategory[]): Brand[] {
  return data.map(toBrand);
}
