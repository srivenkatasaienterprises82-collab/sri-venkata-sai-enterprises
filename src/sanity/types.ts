/** A Sanity image reference object (the shape stored by type: "image" fields). */
export type SanityImageRef = {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  hotspot?: { x: number; y: number; width: number; height: number };
  crop?: { top: number; bottom: number; left: number; right: number };
};

export type SanityProduct = {
  _id: string;
  name: string;
  slug: { current: string };
  type: string;
  stock: string;
  price?: number;
  originalPrice?: number;
  priceOnEnquiry?: boolean;
  amazonUrl?: string;
  flipkartUrl?: string;
  amazonPrice?: number;
  flipkartPrice?: number;
  lastUpdated?: string;
  brand: { name: string; slug: { current: string } };
  brandSlug: string;
  category?: { name: string; slug: { current: string } };
  categorySlug?: string;
  /** Sanity image object (Studio stores images as {_type:"image", asset:{_ref:...}}).
   *  Legacy string URLs may also appear before migration. resolveImage() handles both. */
  coverImage?: SanityImageRef | string;
  /** Array of Sanity image objects OR legacy URL strings. */
  images?: (SanityImageRef | string)[];
  featured?: boolean;
  description?: string;
  colors: { name: string; hex: string }[];
  ramOptions?: string[];
  storageOptions?: string[];
  variants: { ram: string; storage: string; price?: number; originalPrice?: number; amazonPrice?: number; flipkartPrice?: number; amazonUrl?: string; flipkartUrl?: string }[];
  specifications?: { label: string; value: string }[];
};

export type SanityCategory = {
  _id: string;
  name: string;
  slug: { current: string };
  image?: SanityImageRef | string;
  description?: string;
};

export type SanityBrand = {
  _id: string;
  name: string;
  slug: { current: string };
  logo?: SanityImageRef | string;
  description?: string;
  featured?: boolean;
};

export type SanityBanner = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  cta?: string;
  backgroundColor?: string;
  image?: SanityImageRef | string;
  link?: string;
};

export type SanityTestimonial = {
  _id: string;
  name: string;
  quote: string;
  rating: number;
  avatar?: SanityImageRef | string;
};

export type SanityFaq = {
  _id: string;
  question: string;
  answer: string;
};

export type SanityGallery = {
  _id: string;
  image: SanityImageRef | string;
  caption?: string;
};

export type SanityOffer = {
  _id: string;
  title: string;
  badge?: string;
  subtitle?: string;
  discountText?: string;
  image?: SanityImageRef | string;
  link?: string;
  cta?: string;
  expiryDate?: string;
  type: "general" | "bento" | "seasonal" | "flash";
};

export type SanityPage = {
  _id: string;
  title: string;
  slug: { current: string };
  seoDescription?: string;
  content?: any[];
};

export type SanitySiteSettings = {
  companyName: string;
  companyShortName?: string;
  tagline?: string;
  logo?: SanityImageRef | string;
  announcement?: string;
  phoneDisplay?: string;
  phoneTel?: string;
  whatsappNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  city?: string;
  pincode?: string;
  hours?: string;
  googleMapsEmbed?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  footerText?: string;
  copyrightText?: string;
  seoTitleTemplate?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  openGraphImage?: SanityImageRef | string;
};

export type SanityHomePage = {
  heroTitle: string;
  heroSubtitle?: string;
  heroSlides?: string[];
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  featuredCarousel?: SanityProduct[];
  topRatedPerformance?: SanityProduct[];
  bentoDeals?: SanityOffer[];
};
