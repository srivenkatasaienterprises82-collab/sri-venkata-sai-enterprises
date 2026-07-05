import type { Product, ProductVariant, ProductColor, ProductType, StockStatus, ProductCategory } from "@/lib/data/products";
import type { Testimonial } from "@/lib/data/testimonials";
import type { Brand } from "@/lib/data/brands";
import type { FAQItem } from "@/lib/data/faq";
import type {
  SanityProduct,
  SanityBrand,
  SanityTestimonial,
  SanityFaq,
  SanityOffer,
  SanityBanner,
  SanityGallery,
} from "./types";

export function toProduct(s: SanityProduct): Product {
  // Map stock status value safely
  let stockStatus: StockStatus = "inStock";
  if (s.stock === "limited") stockStatus = "limited";
  else if (s.stock === "outOfStock") stockStatus = "outOfStock";

  return {
    id: s._id,
    name: s.name,
    slug: s.slug?.current || "",
    brand: s.brand?.name || "",
    brandSlug: s.brand?.slug?.current || s.brandSlug || "",
    imageFolder: "",
    type: (s.type || "smartphone") as ProductType,
    category: (s.categorySlug || "best-seller") as ProductCategory,
    stock: stockStatus,
    image: s.coverImage || "",
    description: s.description || "",
    price: s.price,
    originalPrice: s.originalPrice,
    colors: (s.colors || []) as ProductColor[],
    variants: (s.variants || []) as ProductVariant[],
    specifications: s.specifications || [],
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
    location: "Customer Review",
    rating: s.rating,
    text: s.quote,
    source: "manual",
  };
}

export function toTestimonials(data: SanityTestimonial[]): Testimonial[] {
  return data.map(toTestimonial);
}

export function toBrand(s: SanityBrand): Brand {
  const slug = s.slug?.current || "";
  const logoFallbacks: Record<string, string> = {
    google: "/images/brand-logos/google pixel logo.webp",
    infinix: "/images/brand-logos/infinix logo.png",
    motorola: "/images/brand-logos/moto logo.png",
    oneplus: "/images/brand-logos/onplus logo.jpg",
    redmi: "/images/brand-logos/redmi logo.png",
  };
  const localLogo = logoFallbacks[slug] || `/images/brand-logos/${slug} logo.png`;
  return {
    name: s.name,
    slug,
    logo: s.logo || localLogo,
    featured: s.featured || false,
  };
}

export function toBrands(data: SanityBrand[]): Brand[] {
  return data.map(toBrand);
}

export function toFaq(s: SanityFaq): FAQItem {
  return {
    question: s.question,
    answer: s.answer,
  };
}

export function toFaqs(data: SanityFaq[]): FAQItem[] {
  return data.map(toFaq);
}

export function toOffer(s: SanityOffer) {
  return {
    _id: s._id,
    title: s.title,
    badge: s.badge || "",
    subtitle: s.subtitle || "",
    discountText: s.discountText || "",
    image: s.image || "",
    link: s.link || "/",
    cta: s.cta || "Claim Offer",
    expiryDate: s.expiryDate,
    type: s.type || "general",
  };
}

export function toOffers(data: SanityOffer[]) {
  return data.map(toOffer);
}

export function toBanner(s: SanityBanner) {
  return {
    id: s._id,
    title: s.title,
    subtitle: s.subtitle || "",
    badge: s.badge || "",
    cta: s.cta || "Shop Now",
    backgroundColor: s.backgroundColor || "#D6EEF5",
    src: s.image || "",
    alt: s.title,
    href: s.link || "/products",
  };
}

export function toBanners(data: SanityBanner[]) {
  return data.map(toBanner);
}

export function toGallery(s: SanityGallery) {
  return {
    id: s._id,
    image: s.image,
    caption: s.caption || "",
  };
}

export function toGalleries(data: SanityGallery[]) {
  return data.map(toGallery);
}

export function toPageContent(blocks: any[] | null | undefined): string {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .filter((b: any) => b._type === "block" && b.children?.length)
    .map((b: any) => {
      const text = b.children
        .filter((c: any) => c._type === "span")
        .map((c: any) => c.text)
        .join("");
      return text;
    })
    .join("\n\n");
}
