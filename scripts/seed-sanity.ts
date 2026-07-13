/**
 * Seed script — pushes all static data to Sanity.
 * Run: npx tsx scripts/seed-sanity.ts
 *
 * Uses the Sanity HTTP API (not @sanity/client) to avoid dependency issues.
 * Falls back gracefully if Sanity token is missing.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { products } from "../src/lib/data/products";
import type { Product } from "../src/lib/data/products";
import { brands } from "../src/lib/data/brands";
import { siteConfig } from "../src/lib/data/siteConfig";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = "production";
const API_VERSION = "v2024-01-01";
const BASE_URL = `https://${PROJECT_ID}.api.sanity.io/${API_VERSION}`;

function getToken(): string | null {
  const token = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
  return token ?? null;
}

async function sanityFetch(query: string): Promise<any> {
  const url = `${BASE_URL}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

async function sanityMutate(mutations: any[]): Promise<any> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/data/mutate/${DATASET}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`Sanity mutate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

type SanityDoc = Record<string, any>;

const CATEGORIES = [
  { id: "cat-new-arrival", name: "New Arrival", slug: "new-arrival" },
  { id: "cat-best-seller", name: "Best Seller", slug: "best-seller" },
  { id: "cat-deal", name: "Deal", slug: "deal" },
  { id: "cat-flagship", name: "Flagship", slug: "flagship" },
  { id: "cat-budget", name: "Budget", slug: "budget" },
  { id: "cat-accessory", name: "Accessory", slug: "accessory" },
];

function productToSanityDoc(product: Product): SanityDoc {
  const categorySlug = product.category;
  const brandDoc = brands.find((b) => b.slug === product.brandSlug);
  const brandName = brandDoc?.name ?? product.brand;

  return {
    _type: "product",
    _id: `product-${product.slug}`,
    name: product.name,
    slug: { _type: "slug", current: product.slug },
    type: product.type,
    stock: product.stock,
    price: product.price ?? product.variants[0]?.price,
    originalPrice: product.originalPrice ?? product.variants[0]?.originalPrice,
    priceOnEnquiry: product.priceOnEnquiry ?? false,
    brand: { _type: "reference", _ref: `brand-${product.brandSlug}` },
    brandSlug: product.brandSlug,
    category: { _type: "reference", _ref: `cat-${categorySlug}` },
    categorySlug: categorySlug,
    amazonUrl: product.amazonUrl,
    flipkartUrl: product.flipkartUrl,
    coverImage: product.image,
    description: product.description,
    colors: (product.colors ?? []).map((c, i) => ({
      _key: `color-${i}-${c.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || i}`,
      name: c.name,
      hex: c.hex,
    })),
    variants: product.variants.map((v, i) => ({
      _key: `v-${i}-${v.ram || "na"}-${v.storage || "na"}`,
      ram: v.ram,
      storage: v.storage,
      price: v.price,
      originalPrice: v.originalPrice,
    })),
    specifications: (product.specifications ?? []).map((s, i) => ({
      _key: `spec-${i}-${s.label?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || i}`,
      label: s.label,
      value: s.value,
    })),
    featured: product.featured,
    lastUpdated: new Date().toISOString(),
    images: [product.image],
  };
}

async function seedBrands(): Promise<void> {
  console.log("\n--- Seeding Brands ---");
  for (const brand of brands) {
    const mutation = {
      createOrReplace: {
        _id: `brand-${brand.slug}`,
        _type: "brand",
        name: brand.name,
        slug: { _type: "slug", current: brand.slug },
        featured: brand.featured ?? false,
        ...(brand.logo ? { logo: brand.logo } : {}),
      },
    };
    try {
      await sanityMutate([mutation]);
      console.log(`  ✓ ${brand.name}`);
    } catch (e: any) {
      console.error(`  ✗ ${brand.name}: ${e.message}`);
    }
  }
}

async function seedCategories(): Promise<void> {
  console.log("\n--- Seeding Categories ---");
  for (const cat of CATEGORIES) {
    const mutation = {
      createOrReplace: {
        _id: cat.id,
        _type: "category",
        name: cat.name,
        slug: { _type: "slug", current: cat.slug },
      },
    };
    try {
      await sanityMutate([mutation]);
      console.log(`  ✓ ${cat.name}`);
    } catch (e: any) {
      console.error(`  ✗ ${cat.name}: ${e.message}`);
    }
  }
}

async function seedProducts(): Promise<void> {
  console.log("\n--- Seeding Products ---");
  let created = 0;
  let errors = 0;
  let skipped = 0;

  const validBrandSlugs = new Set(brands.map((b) => b.slug));

  for (const product of products) {
    if (product.brandSlug && !validBrandSlugs.has(product.brandSlug)) {
      skipped++;
      continue;
    }
    const doc = productToSanityDoc(product);
    const mutation = {
      createOrReplace: {
        ...doc,
      },
    };
    try {
      await sanityMutate([mutation]);
      created++;
      process.stdout.write(".");
    } catch (e: any) {
      console.error(`\n  ✗ ${product.name}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n  ✓ ${created} products created`);
  if (skipped) console.log(`  - ${skipped} skipped (brand not seeded)`);
  if (errors) console.error(`  ✗ ${errors} errors`);
}

// ──────────────────────────────────────
//  Site Settings
// ──────────────────────────────────────
async function seedSiteSettings(): Promise<void> {
  console.log("\n--- Seeding Site Settings ---");
  const doc = {
    _id: "siteSettings",
    _type: "siteSettings",
    companyName: siteConfig.storeName,
    companyShortName: siteConfig.storeShortName,
    tagline: siteConfig.tagline,
    logo: "",
    announcement: "Genuine Mobile Phones • Direct Store Warranty • Best Prices in Ongole",
    phoneDisplay: siteConfig.phoneDisplay,
    phoneTel: siteConfig.phoneTel,
    whatsappNumber: siteConfig.whatsappNumber,
    email: "info@srivenkatesai.com",
    addressLine1: siteConfig.address.line1,
    addressLine2: siteConfig.address.line2,
    addressLine3: siteConfig.address.line3,
    addressLine4: siteConfig.address.line4,
    city: siteConfig.address.city,
    pincode: siteConfig.address.pincode,
    hours: siteConfig.hours,
    googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3829.4355523996715!2d80.03632557591871!3d15.512699985090159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4b011400000001%3A0xc6cb1c7ea6bfdb!2sSri%20Venkata%20Sai%20Enterprises!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
    facebookUrl: "",
    instagramUrl: "https://www.instagram.com/sri_venkata_sai_enterprises/",
    youtubeUrl: "",
    linkedinUrl: "",
    footerText: "Premium mobile store in Ongole. Shop genuine smartphones, tablets, and accessories with official brand warranty, best pricing, EMI facilities, and reliable after-sales support.",
    copyrightText: "© 2026 Sri Venkata Sai Enterprises. All rights reserved.",
    seoTitleTemplate: `${siteConfig.storeName} | Premium Mobile Store in ${siteConfig.address.city}`,
    seoDescription: `Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo & Motorola. Best prices, EMI options, exchange offers, and fast local service in ${siteConfig.address.city}.`,
    seoKeywords: ["mobile store", "smartphones", "Ongole", "iPhone", "Samsung", "Vivo", "Motorola", "OnePlus", "Realme"],
    openGraphImage: "",
  };
  try {
    await sanityMutate([{ createOrReplace: doc }]);
    console.log("  ✓ Site Settings");
  } catch (e: any) {
    console.error(`  ✗ Site Settings: ${e.message}`);
  }
}

// ──────────────────────────────────────
//  Home Page
// ──────────────────────────────────────
function ptBlock(style: string, text: string): any {
  return {
    _type: "block",
    style,
    children: [{ _type: "span", text }],
    markDefs: [],
  };
}

function makePT(blocks: { style: string; text: string }[]): any[] {
  return blocks.map((b) => ptBlock(b.style, b.text));
}

async function seedHomePage(): Promise<void> {
  console.log("\n--- Seeding Home Page ---");

  // Pick featured product IDs for carousels (first 14 + 6 semi-flagship)
  const featured = products.filter((p) => p.featured);
  const carouselIds = featured.slice(0, 14).map((p) => ({ _type: "reference", _ref: `product-${p.slug}` }));
  const topRatedIds = featured.filter((p) => p.price && p.price > 30000).slice(0, 6).map((p) => ({ _type: "reference", _ref: `product-${p.slug}` }));
  const allBrandSlugs = [...new Set(featured.map((p) => p.brandSlug))];
  const heroSlides = allBrandSlugs.slice(0, 5).map((slug) => {
    const brand = brands.find((b) => b.slug === slug);
    return brand?.logo || `/images/brand-logos/${slug} logo.png`;
  });

  const doc = {
    _id: "homePage",
    _type: "homePage",
    heroTitle: `${siteConfig.storeName} — Ongole’s Best Mobile Deals`,
    heroSubtitle: `Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo, Motorola, OnePlus & more. Official warranty, EMI available, best prices guaranteed.`,
    heroSlides,
    primaryCtaText: "Browse Mobiles",
    primaryCtaLink: "/products",
    secondaryCtaText: "WhatsApp Us",
    secondaryCtaLink: siteConfig.whatsappUrl,
    featuredCarousel: carouselIds,
    topRatedPerformance: topRatedIds,
  };

  try {
    await sanityMutate([{ createOrReplace: doc }]);
    console.log("  ✓ Home Page");
  } catch (e: any) {
    console.error(`  ✗ Home Page: ${e.message}`);
  }
}

// ──────────────────────────────────────
//  Banners
// ──────────────────────────────────────
const BANNERS = [
  {
    _id: "banner-iqoo-15r",
    title: "iQOO 15R",
    subtitle: "Dimensity 7300 • 50MP OIS • 120Hz AMOLED",
    badge: "Just Launched",
    cta: "View iQOO Phones",
    backgroundColor: "#1a1a2e",
    image: "/images/promo-banner/promo-1.png",
    link: "/products?brand=iqoo",
    active: true,
    order: 1,
  },
  {
    _id: "banner-motorola-edge-70-pro",
    title: "Motorola Edge 70 Pro",
    subtitle: "Snapdragon 8 Gen 3 • 200MP • 125W TurboCharge",
    badge: "Flagship",
    cta: "Explore Motorola",
    backgroundColor: "#0d2137",
    image: "/images/promo-banner/promo-2.png",
    link: "/products?brand=motorola",
    active: true,
    order: 2,
  },
  {
    _id: "banner-iphone-17",
    title: "iPhone 17 Series",
    subtitle: "A19 chip • 48MP pro camera system • Titanium design",
    badge: "New",
    cta: "View iPhones",
    backgroundColor: "#1c1c1e",
    image: "/images/promo-banner/promo-3.png",
    link: "/products?brand=apple",
    active: true,
    order: 3,
  },
  {
    _id: "banner-iqoo-neo-10-pro",
    title: "iQOO Neo 10 Pro",
    subtitle: "Dimensity 9400 • 120W FlashCharge • 50MP+50MP",
    badge: "Performance Beast",
    cta: "Get It Now",
    backgroundColor: "#2d1b69",
    image: "/images/promo-banner/promo-4.png",
    link: "/products?brand=iqoo",
    active: true,
    order: 4,
  },
];

async function seedBanners(): Promise<void> {
  console.log("\n--- Seeding Banners ---");
  for (const banner of BANNERS) {
    try {
      await sanityMutate([{ createOrReplace: { ...banner, _type: "banner" } }]);
      console.log(`  ✓ ${banner.title}`);
    } catch (e: any) {
      console.error(`  ✗ ${banner.title}: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────
//  Testimonials
// ──────────────────────────────────────
const TESTIMONIALS = [
  { _id: "test-1", name: "Arun Kumar", quote: "Best place to buy phones in Ongole. Genuine products, great prices, and the team really knows their stuff. Highly recommended!", rating: 5 },
  { _id: "test-2", name: "Srinivas Reddy", quote: "Got my iPhone 16 Pro from here. Beat the online price by ₹3,000 and they set everything up for me. Excellent service!", rating: 5 },
  { _id: "test-3", name: "Lakshmi Priya", quote: "Was unsure between two Vivo models. The team patiently explained the differences and helped me pick the right one. No pressure at all.", rating: 5 },
  { _id: "test-4", name: "Ravi Teja", quote: "Exchange offer was way better than what OLX or Cashify quoted. Got a fair price for my old phone and walked out with a new iQOO the same day.", rating: 5 },
  { _id: "test-5", name: "Mohan Rao", quote: "Ordered online via WhatsApp and got next-day delivery in Chirala. Phone was sealed, genuine, with proper bill. Trustworthy store.", rating: 4 },
  { _id: "test-6", name: "Sai Charan", quote: "Been buying from Sri Venkata Sai for 3 years now. From budget phones to flagships — always genuine. They never disappoint.", rating: 5 },
];

async function seedTestimonials(): Promise<void> {
  console.log("\n--- Seeding Testimonials ---");
  for (const t of TESTIMONIALS) {
    try {
      await sanityMutate([{ createOrReplace: { ...t, _type: "testimonial" } }]);
      console.log(`  ✓ ${t.name}`);
    } catch (e: any) {
      console.error(`  ✗ ${t.name}: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────
//  FAQs
// ──────────────────────────────────────
const FAQS = [
  { _id: "faq-1", question: "Are the phones you sell genuine?", answer: "Absolutely. Every smartphone we sell is sourced from authorized brand distributors and comes with an official brand warranty, original sealed box, accessories, and a valid GST invoice.", order: 1 },
  { _id: "faq-2", question: "Do you offer EMI?", answer: "Yes! We offer 0% EMI options through leading banks and NBFCs with tenures from 3 to 12 months. EMI eligibility is confirmed at checkout.", order: 2 },
  { _id: "faq-3", question: "Can I exchange my old phone?", answer: "Yes. Bring your old phone to our Ongole store for a free inspection and instant exchange valuation. Exchange discounts are applied toward your new purchase.", order: 3 },
  { _id: "faq-4", question: "Do you deliver across Andhra Pradesh?", answer: "Yes, we ship across Andhra Pradesh via trusted courier partners. Delivery typically takes 2–4 business days. Free local delivery within Ongole city is usually same-day or next-day for orders before 6 PM.", order: 4 },
  { _id: "faq-5", question: "Is online payment available?", answer: "Orders placed through this website are enquiry-based. No payment is taken online. You pay at the store or on delivery as mutually agreed upon.", order: 5 },
  { _id: "faq-6", question: "What warranty comes with the phone?", answer: "All smartphones carry the official brand warranty (typically 1 year). Warranty and support are handled through the brand's authorized service centres.", order: 6 },
  { _id: "faq-7", question: "Can I visit the store to see phones in person?", answer: "Absolutely. Our store on Kurnool Road, Ongole has live demo units of most models. Walk in anytime between 10 AM and 9 PM to compare phones hands-on.", order: 7 },
  { _id: "faq-8", question: "Do you sell accessories like cases and chargers?", answer: "Yes, we stock original and high-quality third-party accessories including cases, screen protectors, chargers, earphones, and power banks for most models.", order: 8 },
];

async function seedFaqs(): Promise<void> {
  console.log("\n--- Seeding FAQs ---");
  for (const f of FAQS) {
    try {
      const { order, ...doc } = f;
      await sanityMutate([{ createOrReplace: { ...doc, _type: "faq", order } }]);
      console.log(`  ✓ ${f.question.slice(0, 40)}...`);
    } catch (e: any) {
      console.error(`  ✗ ${f.question.slice(0, 40)}: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────
//  Gallery
// ──────────────────────────────────────
const GALLERY_ITEMS = [
  { _id: "gallery-1", image: "https://via.placeholder.com/800x600/e2e8f0/1e293b?text=Authorized+Partner+Store", caption: "Authorized Partner Store", order: 1 },
  { _id: "gallery-2", image: "https://via.placeholder.com/800x600/e2e8f0/1e293b?text=Wide+Range+of+Smartphones", caption: "Wide Range of Smartphones", order: 2 },
  { _id: "gallery-3", image: "https://via.placeholder.com/800x600/e2e8f0/1e293b?text=Live+Demo+Counter", caption: "Live Demo Counter", order: 3 },
];

async function seedGallery(): Promise<void> {
  console.log("\n--- Seeding Gallery ---");
  for (const g of GALLERY_ITEMS) {
    try {
      const { order, ...doc } = g;
      await sanityMutate([{ createOrReplace: { ...doc, _type: "gallery", order } }]);
      console.log(`  ✓ ${g.caption}`);
    } catch (e: any) {
      console.error(`  ✗ ${g.caption}: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────
//  Offers (for Bento Deals)
// ──────────────────────────────────────
const OFFERS = [
  {
    _id: "offer-iqoo-z11x",
    title: "iQOO Z11x 5G",
    badge: "Flagship Deal",
    subtitle: "Dimensity 7300 • 50MP OIS • 120Hz",
    discountText: "From ₹22,999",
    image: "https://via.placeholder.com/600x400/1a1a2e/ffffff?text=iQOO+Z11x+5G",
    link: "/products?brand=iqoo",
    cta: "Explore iQOO",
    type: "bento",
    expiryDate: "",
  },
  {
    _id: "offer-emi",
    title: "0% EMI — Starting at ₹3,833/mo",
    badge: "No Cost EMI",
    subtitle: "3 to 12 months tenure • Instant approval",
    discountText: "0% Interest",
    image: "",
    link: "/shipping-policy",
    cta: "Check Eligibility",
    type: "bento",
    expiryDate: "",
  },
  {
    _id: "offer-exchange",
    title: "Exchange Bonus Up to ₹5,000",
    badge: "Extra Savings",
    subtitle: "Fair valuation • Instant discount on new purchase",
    discountText: "Bonus + Value",
    image: "",
    link: "/shipping-policy",
    cta: "Check Value",
    type: "bento",
    expiryDate: "",
  },
  {
    _id: "offer-vivo-t5x",
    title: "Vivo T5x 5G",
    badge: "Popular Choice",
    subtitle: "6000mAh • 50MP • 120Hz display",
    discountText: "From ₹18,999",
    image: "https://via.placeholder.com/600x400/4a1a2e/ffffff?text=Vivo+T5x+5G",
    link: "/products?brand=vivo",
    cta: "View Vivo",
    type: "bento",
    expiryDate: "",
  },
  {
    _id: "offer-seasonal-sale",
    title: "Monsoon Mega Sale",
    badge: "Limited Time",
    subtitle: "Extra discounts on select brands. Valid till stock lasts.",
    discountText: "Up to 15% Off",
    image: "",
    link: "/products",
    cta: "Shop Sale",
    type: "seasonal",
    expiryDate: "2026-08-15",
  },
];

async function seedOffers(): Promise<void> {
  console.log("\n--- Seeding Offers ---");
  for (const o of OFFERS) {
    try {
      await sanityMutate([{ createOrReplace: { ...o, _type: "offer" } }]);
      console.log(`  ✓ ${o.title.slice(0, 40)}`);
    } catch (e: any) {
      console.error(`  ✗ ${o.title.slice(0, 40)}: ${e.message}`);
    }
  }

  // Link bento offers into homePage
  try {
    const bentoRefs = OFFERS.filter((o) => o.type === "bento").map((o) => ({
      _type: "reference",
      _ref: o._id,
    }));
    await sanityMutate([
      {
        patch: {
          id: "homePage",
          set: { bentoDeals: bentoRefs },
        },
      },
    ]);
    console.log("  ✓ Linked bento deals to homePage");
  } catch (e: any) {
    console.error(`  ✗ Linking bento deals: ${e.message}`);
  }
}

// ──────────────────────────────────────
//  Pages (About, Privacy, Terms, Shipping)
// ──────────────────────────────────────
function makePageContent(blocks: { style: string; text: string }[]): any[] {
  return blocks.map((b) => ({
    _type: "block",
    style: b.style,
    children: [{ _type: "span", text: b.text, marks: [] }],
    markDefs: [],
    _key: `block-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

async function seedPages(): Promise<void> {
  console.log("\n--- Seeding Pages ---");

  const pages = [
    // About
    {
      _id: "page-about",
      _type: "page",
      title: "About Us",
      slug: { _type: "slug", current: "about" },
      seoDescription: `${siteConfig.address.city}'s trusted mobile store with ${siteConfig.happyCustomers} happy customers. Genuine smartphones, official warranty, EMI options, fair exchange values & personal service.`,
      content: makePageContent([
        { style: "normal", text: `${siteConfig.address.city}'s trusted destination for genuine smartphones. We've served ${siteConfig.happyCustomers} happy customers with honest advice, fair prices, and reliable after-sales service.` },
        { style: "normal", text: `Located on Kurnool Road in the heart of ${siteConfig.address.city}, ${siteConfig.storeName} stocks ${siteConfig.phonesInStock} smartphones from top brands including Apple, Samsung, Vivo, iQOO, Oppo, Motorola, OnePlus, and Realme. Every device we sell is 100% genuine, sourced from authorized distributors, and comes with official brand warranty and a GST invoice.` },
        { style: "normal", text: "We believe buying a smartphone should be simple, transparent, and enjoyable. That's why we offer flexible EMI options, fair exchange values, competitive pricing, and personal guidance to help you choose the perfect device." },
        { style: "normal", text: "Whether you visit our store, call us, or WhatsApp us, you'll always get honest advice, genuine products, and the best possible price. Our customers come back because they trust us — and we work hard to earn that trust every single day." },
      ]),
    },
    // Privacy
    {
      _id: "page-privacy",
      _type: "page",
      title: "Privacy Policy",
      slug: { _type: "slug", current: "privacy" },
      seoDescription: "How Sri Venkata Sai Enterprises collects, uses, stores, and protects visitor and order data.",
      content: makePageContent([
        { style: "normal", text: `Sri Venkata Sai Enterprises ("we", "us") respects your privacy. This policy explains what we collect, why, and how we protect it. Last updated: June 2026.` },
        { style: "h2", text: "1. Information We Collect" },
        { style: "normal", text: "We collect only the information needed to process your order and respond to your enquiries: Contact details: your name, phone number, and (optionally) email address. Delivery details: your city, pincode, and delivery address. Order details: the product(s), variant, colour, quantity, and any notes you add." },
        { style: "h2", text: "2. How We Use Your Information" },
        { style: "normal", text: "We use your information solely to confirm availability, price, and offer eligibility for your order; coordinate delivery or store pickup; and provide after-sales support and warranty assistance. We do not use your data for unsolicited marketing calls or messages." },
        { style: "h2", text: "3. How We Share Your Information" },
        { style: "normal", text: "When you place an order, your order details are shared with our team via WhatsApp and, where configured, a Google Sheets order log used for fulfilment and customer support. If your order is delivered, your name, phone, and address are shared with our trusted logistics partner for delivery only. We never sell or rent your personal data to any third party." },
        { style: "h2", text: "4. Data Storage & Security" },
        { style: "normal", text: "Order data is stored in our private order log and accessed only by authorised staff. Browsing data may be analysed in aggregate (e.g. via privacy-friendly analytics) to improve the website; it is not linked to your identity." },
        { style: "h2", text: "5. Your Rights" },
        { style: "normal", text: "You may request access to, correction of, or deletion of your personal data at any time. To exercise these rights, contact us using the details below and we will respond within a reasonable timeframe." },
        { style: "h2", text: "6. Changes to This Policy" },
        { style: "normal", text: "We may update this policy from time to time. Any changes will be posted on this page with an updated revision date." },
      ]),
    },
    // Terms
    {
      _id: "page-terms",
      _type: "page",
      title: "Terms of Service",
      slug: { _type: "slug", current: "terms" },
      seoDescription: "Terms for using the Sri Venkata Sai Enterprises website, including pricing, ordering, warranty, and support.",
      content: makePageContent([
        { style: "normal", text: `These terms govern your use of the ${siteConfig.storeName} website and the orders you place through it. By using this site, you agree to the terms below.` },
        { style: "h2", text: "1. Pricing & Availability" },
        { style: "normal", text: "All prices shown on this website are indicative and subject to change without notice. Prices marked 'Price on Enquiry' are confirmed on WhatsApp or at the store. Final pricing, including applicable taxes and any active offers, is confirmed at the time of purchase. Product availability, colours, and storage variants may vary. We will confirm real-time stock before confirming your order." },
        { style: "h2", text: "2. Orders & Confirmation" },
        { style: "normal", text: "Orders placed through this website are enquiry-based and are confirmed via WhatsApp or phone. No payment is taken online at the time of order submission. We recommend retaining all order-related messages for future support." },
        { style: "h2", text: "3. Payment, EMI & Exchange" },
        { style: "normal", text: "Payment is made at the store or on delivery as mutually agreed. EMI options are provided through leading banks and NBFCs and are subject to their approval and terms. Exchange values for old devices are assessed on inspection of the device and are subject to its condition." },
        { style: "h2", text: "4. Warranty & Support" },
        { style: "normal", text: "All smartphones carry the official brand warranty (typically 1 year) as per the manufacturer's service policy. Warranty and support claims are handled through the brand's authorised service centres and are subject to verification at our store." },
        { style: "h2", text: "5. Returns & Refunds" },
        { style: "normal", text: "As sealed electronic goods, smartphones are non-returnable once unboxed unless defective and covered under the brand's warranty or applicable consumer protection law. Please inspect your device at the time of purchase or delivery." },
        { style: "h2", text: "6. Website Use" },
        { style: "normal", text: "Content on this website (product names, specifications, and images) is provided for information and may be updated at any time. Trademarks and brand names belong to their respective owners and are used here for identification only." },
      ]),
    },
    // Shipping Policy
    {
      _id: "page-shipping",
      _type: "page",
      title: "Shipping & Delivery Policy",
      slug: { _type: "slug", current: "shipping-policy" },
      seoDescription: `Free delivery across ${siteConfig.address.city} and Andhra Pradesh. Local pickup available. 1-year warranty on all smartphones. Exchange and EMI terms explained.`,
      content: makePageContent([
        { style: "normal", text: `We aim to make receiving your new phone as pleasant as buying it. Here is everything you need to know about delivery, warranty, exchange, and EMI.` },
        { style: "h2", text: "Free Local Delivery" },
        { style: "normal", text: `Free doorstep delivery within ${siteConfig.address.city} city limits. Orders placed before 6 PM are usually delivered the same day or next morning.` },
        { style: "h2", text: "Andhra Pradesh Delivery" },
        { style: "normal", text: "We ship across Andhra Pradesh via trusted courier partners. Delivery typically takes 2–4 business days. Tracking details are shared via WhatsApp." },
        { style: "h2", text: "What You Get" },
        { style: "normal", text: "Every order includes the phone in its original sealed box, original charger, data cable, SIM ejector, warranty card, and a GST invoice." },
        { style: "h2", text: "Warranty" },
        { style: "normal", text: `All smartphones come with the official manufacturer warranty (typically 1 year). Warranty claims are handled directly through the brand's service centre in ${siteConfig.address.city} or Vijayawada.` },
        { style: "h2", text: "Exchange" },
        { style: "normal", text: "Bring your old phone to the store for a fair exchange valuation. Exchange discounts are applied at checkout. Online estimates are indicative — final value is confirmed in-store." },
        { style: "h2", text: "EMI Terms" },
        { style: "normal", text: "0% EMI available on select cards and NBFCs. Tenure ranges from 3 to 12 months. EMI eligibility is subject to bank/NBFC approval at checkout." },
      ]),
    },
  ];

  for (const page of pages) {
    try {
      await sanityMutate([{ createOrReplace: page }]);
      console.log(`  ✓ ${page.title}`);
    } catch (e: any) {
      console.error(`  ✗ ${page.title}: ${e.message}`);
    }
  }
}

async function main(): Promise<void> {
  const token = getToken();
  if (!token) {
    console.warn("⚠ No SANITY_TOKEN or SANITY_API_READ_TOKEN found in environment.");
    console.warn("Using unauthenticated requests — will only work for reads.");
    console.warn("Set the env var before running: $env:SANITY_TOKEN='...'\n");
  }

  console.log(`Seeding Sanity project ${PROJECT_ID}, dataset ${DATASET}...`);

  // Verify connection
  try {
    await sanityFetch("*[_type == 'brand'][0...1]");
    console.log("✓ Connected to Sanity");
  } catch (e: any) {
    console.error(`✗ Cannot connect to Sanity: ${e.message}`);
    process.exit(1);
  }

  await seedSiteSettings();
  await seedCategories();
  await seedBrands();
  await seedProducts();
  await seedBanners();
  await seedTestimonials();
  await seedFaqs();
  await seedGallery();
  await seedHomePage();
  await seedOffers();
  await seedPages();

  console.log("\n✓ Seeding complete!");
  console.log(`   → ${products.length} products from static data`);
  console.log(`   → ${brands.length} brands`);
  console.log(`   → ${CATEGORIES.length} categories`);
  console.log(`   → ${BANNERS.length} banners`);
  console.log(`   → ${TESTIMONIALS.length} testimonials`);
  console.log(`   → ${FAQS.length} FAQs`);
  console.log(`   → ${GALLERY_ITEMS.length} gallery items`);
  console.log(`   → ${OFFERS.length} offers`);
  console.log(`   → 4 pages (About, Privacy, Terms, Shipping)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
