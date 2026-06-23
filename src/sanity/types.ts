export type SanityProduct = {
  _id: string;
  name: string;
  slug: { current: string };
  type: string;
  stock: number;
  price: number;
  originalPrice?: number;
  priceOnEnquiry?: boolean;
  brand: { name: string; slug: { current: string } };
  brandSlug: string;
  coverImage?: string;
  images?: string[];
  featured?: boolean;
  description?: string;
  colors: { name: string; hex: string }[];
  variants: { ram: string; storage: string; price: number; originalPrice?: number }[];
  specifications?: Record<string, string>;
};

export type SanityCategory = {
  _id: string;
  name: string;
  slug: { current: string };
  logo?: string;
  description?: string;
};

export type SanityBanner = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  cta?: string;
  backgroundColor?: string;
  image?: string;
  link?: string;
};

export type SanityTestimonial = {
  _id: string;
  name: string;
  quote: string;
  rating: number;
  avatar?: string;
};
