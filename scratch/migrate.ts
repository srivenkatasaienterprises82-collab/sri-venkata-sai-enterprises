/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "next-sanity";
import fs from "fs";
import path from "path";
import { brands } from "../src/lib/data/brands";
import { testimonials } from "../src/lib/data/testimonials";
import { faqs } from "../src/lib/data/faq";
import { products } from "../src/lib/data/products";

const writeToken = process.env.SANITY_API_WRITE_TOKEN;

if (!writeToken) {
  console.error("❌ ERROR: SANITY_API_WRITE_TOKEN environment variable is not defined.");
  console.error("Please add it to .env.local and run again with the environment variable set.");
  process.exit(1);
}

const client = createClient({
  projectId: "fs9q51h4",
  dataset: "production",
  apiVersion: "2026-06-23",
  useCdn: false,
  token: writeToken,
});

async function uploadImageIfExists(localPath: string): Promise<string | null> {
  const absolutePath = path.join(process.cwd(), "public", localPath);
  if (!fs.existsSync(absolutePath)) {
    // Try without leading slash or public
    const alternativePath = path.join(process.cwd(), localPath);
    if (!fs.existsSync(alternativePath)) {
      return null;
    }
    localPath = alternativePath;
  } else {
    localPath = absolutePath;
  }

  try {
    const fileStream = fs.createReadStream(localPath);
    console.log(`📤 Uploading image asset: ${localPath}...`);
    const asset = await client.assets.upload("image", fileStream, {
      filename: path.basename(localPath),
    });
    return asset._id;
  } catch (err) {
    console.error(`⚠️ Failed to upload image ${localPath}:`, err);
    return null;
  }
}

async function run() {
  console.log("🚀 Starting Sanity Content Migration...");

  // 1. Create Product Categories
  const categoriesList = [
    { id: "category-new-arrival", name: "New Arrival", slug: "new-arrival", description: "Latest incoming smartphones and devices" },
    { id: "category-best-seller", name: "Best Seller", slug: "best-seller", description: "Most popular devices trending right now" },
    { id: "category-deal", name: "Deal", slug: "deal", description: "Special discounts and limited-period deals" },
    { id: "category-flagship", name: "Flagship", slug: "flagship", description: "Top-of-the-line premium smartphones" },
    { id: "category-budget", name: "Budget", slug: "budget", description: "Value-packed affordable mobile phones" },
    { id: "category-accessory", name: "Accessory", slug: "accessory", description: "Premium audio, cases, chargers and more" },
  ];

  console.log("📁 Migrating Product Categories...");
  for (const cat of categoriesList) {
    const doc = {
      _type: "category",
      _id: cat.id,
      name: cat.name,
      slug: { _type: "slug", current: cat.slug },
      description: cat.description,
    };
    await client.createOrReplace(doc);
  }
  console.log("✅ Product Categories migrated.");

  // 2. Create Brands
  console.log("🏷️ Migrating Brands...");
  for (const brand of brands) {
    const brandId = `brand-${brand.slug}`;
    let logoAssetId: string | null = null;

    if (brand.logo) {
      logoAssetId = await uploadImageIfExists(brand.logo);
    }

    const doc: any = {
      _type: "brand",
      _id: brandId,
      name: brand.name,
      slug: { _type: "slug", current: brand.slug },
      featured: brand.featured,
      order: 0,
      hidden: false,
    };

    if (logoAssetId) {
      doc.logo = {
        _type: "image",
        asset: { _type: "reference", _ref: logoAssetId },
      };
    }

    await client.createOrReplace(doc);
    console.log(`✅ Brand: ${brand.name}`);
  }

  // 3. Create Testimonials
  console.log("⭐ Migrating Testimonials...");
  for (let i = 0; i < testimonials.length; i++) {
    const test = testimonials[i];
    const testId = `testimonial-${i}`;
    const doc = {
      _type: "testimonial",
      _id: testId,
      name: test.name,
      quote: test.text,
      rating: test.rating,
    };
    await client.createOrReplace(doc);
    console.log(`✅ Testimonial: ${test.name}`);
  }

  // 4. Create FAQs
  console.log("❓ Migrating FAQs...");
  for (let i = 0; i < faqs.length; i++) {
    const faqItem = faqs[i];
    const faqId = `faq-${i}`;
    const doc = {
      _type: "faq",
      _id: faqId,
      question: faqItem.question,
      answer: faqItem.answer,
      order: i,
    };
    await client.createOrReplace(doc);
    console.log(`✅ FAQ: ${faqItem.question.slice(0, 30)}...`);
  }

  // 5. Create Products
  console.log("📱 Migrating Products...");
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const prodId = `product-${prod.slug}`;

    console.log(`Processing Product: ${prod.name}...`);
    let coverAssetId: string | null = null;
    if (prod.image) {
      coverAssetId = await uploadImageIfExists(prod.image);
    }

    const doc: any = {
      _type: "product",
      _id: prodId,
      name: prod.name,
      slug: { _type: "slug", current: prod.slug },
      type: prod.type,
      description: prod.description,
      featured: prod.featured,
      enabled: true,
      order: i,
      stock: prod.stock,
      priceOnEnquiry: prod.priceOnEnquiry || false,
      colors: prod.colors.map(c => ({ name: c.name, hex: c.hex })),
      variants: prod.variants.map(v => ({
        ram: v.ram,
        storage: v.storage,
        price: v.price,
        originalPrice: v.originalPrice,
      })),
      specifications: prod.specifications.map(s => ({
        label: s.label,
        value: s.value,
      })),
      brand: {
        _type: "reference",
        _ref: `brand-${prod.brandSlug}`,
      },
      category: {
        _type: "reference",
        _ref: `category-${prod.category}`,
      },
    };

    if (coverAssetId) {
      doc.coverImage = {
        _type: "image",
        asset: { _type: "reference", _ref: coverAssetId },
      };
    }

    await client.createOrReplace(doc);
    console.log(`✅ Product migrated: ${prod.name}`);
  }

  // 6. Create default Site Settings singleton
  console.log("⚙️ Creating default Global Site Settings singleton...");
  const settingsDoc = {
    _type: "siteSettings",
    _id: "siteSettings",
    companyName: "Sri Venkata Sai Enterprises",
    companyShortName: "Sri Venkata Sai",
    tagline: "Ongole's #1 Mobile Store",
    phoneDisplay: "+91 99486 18414",
    phoneTel: "+919948618414",
    whatsappNumber: "919948618414",
    addressLine1: "Sri Venkata Sai Enterprises",
    addressLine2: "Shop No 2, Pushpa Medicals Back Side",
    addressLine3: "Beside Tanishq Jewellers",
    addressLine4: "Kurnool Road, Ongole - 523001",
    city: "Ongole",
    pincode: "523001",
    hours: "Mon – Sun: 10:00 AM – 9:00 PM",
    googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3843.5!2d80.0486!3d15.5037!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4b74db39b94b4b%3A0x8cce8e2a5e7d5a0!2sOngole%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1700000000000",
    footerText: "Premium mobile store in Ongole. Shop genuine smartphones, tablets, and accessories with official brand warranty, best pricing, EMI facilities, and reliable after-sales support.",
    copyrightText: "© 2026 Sri Venkata Sai Enterprises. All rights reserved.",
    seoTitleTemplate: "Sri Venkata Sai Enterprises | Premium Mobile Store in Ongole",
    seoDescription: "Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo & Motorola. Best prices, EMI options, exchange offers, and fast local service in Ongole.",
    seoKeywords: ["mobiles Ongole", "smartphones Ongole", "Sri Venkata Sai Enterprises", "mobile store Ongole"],
  };
  await client.createOrReplace(settingsDoc);
  console.log("✅ Site Settings created.");

  // 7. Create default Home Page configuration singleton
  console.log("🏠 Creating default Home Page configuration singleton...");
  const homeDoc = {
    _type: "homePage",
    _id: "homePage",
    heroTitle: "Latest Mobiles at Best Prices",
    heroSubtitle: "Shop genuine smartphones with EMI options, exchange offers, and personal buying help",
    primaryCtaText: "Browse Mobiles",
    primaryCtaLink: "/products",
    secondaryCtaText: "Get in Touch",
    secondaryCtaLink: "/contact",
    featuredCarousel: [
      { _type: "reference", _ref: "product-vivo-v70", _key: "ref-1" },
      { _type: "reference", _ref: "product-vivo-t4x", _key: "ref-2" },
      { _type: "reference", _ref: "product-vivo-t4-ultra", _key: "ref-3" },
      { _type: "reference", _ref: "product-iqoo-neo-10", _key: "ref-4" },
      { _type: "reference", _ref: "product-samsung-s25-ultra", _key: "ref-5" },
      { _type: "reference", _ref: "product-moto-edge-60", _key: "ref-6" },
    ],
    topRatedPerformance: [
      { _type: "reference", _ref: "product-samsung-s25-ultra", _key: "tr-1" },
      { _type: "reference", _ref: "product-iqoo-15", _key: "tr-2" },
      { _type: "reference", _ref: "product-samsung-s26-plus", _key: "tr-3" },
      { _type: "reference", _ref: "product-vivo-t4-ultra", _key: "tr-4" },
    ],
  };
  await client.createOrReplace(homeDoc);
  console.log("✅ Home Page Settings created.");

  console.log("\n🎉 Content migration finished successfully!");
}

run().catch(err => {
  console.error("❌ Migration failed with error:", err);
  process.exit(1);
});
