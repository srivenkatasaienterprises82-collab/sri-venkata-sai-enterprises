import { defineField, defineType } from "sanity";

const slugField = defineField({
  name: "slug",
  title: "Slug",
  type: "slug",
  options: { source: "name", maxLength: 96 },
  validation: (r) => r.required(),
});

export const brand = defineType({
  name: "brand",
  title: "Brand",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    slugField,
    defineField({ name: "logo", title: "Logo", type: "image", options: { hotspot: true }, description: "Upload the brand logo (or drag & drop). You can also paste an image URL." }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
  ],
});

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    slugField,
    defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true }, description: "Upload a category image" }),
    defineField({ name: "description", title: "Description", type: "text" }),
  ],
});

export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    slugField,
    defineField({ name: "type", title: "Type", type: "string", description: "e.g. smartphone, tablet, accessory" }),
    defineField({
      name: "stock",
      title: "Stock",
      type: "string",
      options: { list: ["in-stock", "out-of-stock", "pre-order"] },
    }),
    defineField({ name: "price", title: "Price (₹)", type: "number" }),
    defineField({ name: "originalPrice", title: "Original Price (₹)", type: "number" }),
    defineField({ name: "priceOnEnquiry", title: "Price on Enquiry", type: "boolean", initialValue: false }),
    defineField({
      name: "priceLocked",
      title: "Lock price (ignore auto-sync)",
      type: "boolean",
      initialValue: false,
      description: "When checked, the 6-hour price-sync will NOT overwrite this product's price. Use this to keep a manual Studio price.",
    }),
    defineField({ name: "brand", title: "Brand", type: "reference", to: [{ type: "brand" }] }),
    defineField({ name: "brandSlug", title: "Brand Slug", type: "string" }),
    defineField({ name: "category", title: "Category", type: "reference", to: [{ type: "category" }] }),
    defineField({ name: "categorySlug", title: "Category Slug", type: "string" }),
    defineField({ name: "amazonUrl", title: "Amazon URL", type: "url" }),
    defineField({ name: "flipkartUrl", title: "Flipkart URL", type: "url" }),
    defineField({ name: "coverImage", title: "Cover Image", type: "image", options: { hotspot: true }, description: "Upload the main product photo" }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      description: "Extra product photos (gallery)",
    }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({
      name: "colors",
      title: "Colors",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "name", title: "Name", type: "string" }),
            defineField({ name: "hex", title: "Hex", type: "string" }),
          ],
        },
      ],
    }),
    defineField({ name: "ramOptions", title: "RAM Options", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "storageOptions", title: "Storage Options", type: "array", of: [{ type: "string" }] }),
    defineField({
      name: "variants",
      title: "Variants",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "ram", title: "RAM", type: "string" }),
            defineField({ name: "storage", title: "Storage", type: "string" }),
            defineField({ name: "price", title: "Price (₹)", type: "number" }),
            defineField({ name: "originalPrice", title: "Original Price (₹)", type: "number" }),
          ],
        },
      ],
    }),
    defineField({
      name: "specifications",
      title: "Specifications",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "value", title: "Value", type: "string" }),
          ],
        },
      ],
    }),
    defineField({ name: "lastUpdated", title: "Last Updated", type: "datetime" }),
  ],
});

export const banner = defineType({
  name: "banner",
  title: "Banner",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "subtitle", title: "Subtitle", type: "string" }),
    defineField({ name: "badge", title: "Badge", type: "string" }),
    defineField({ name: "cta", title: "CTA Text", type: "string" }),
    defineField({ name: "backgroundColor", title: "Background Color", type: "string", description: "Hex color" }),
    defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true }, description: "Upload a banner image" }),
    defineField({ name: "link", title: "Link", type: "url" }),
    defineField({ name: "active", title: "Active", type: "boolean", initialValue: true }),
    defineField({ name: "order", title: "Order", type: "number" }),
  ],
});

export const testimonial = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "quote", title: "Quote", type: "text" }),
    defineField({ name: "rating", title: "Rating", type: "number", validation: (r) => r.min(1).max(5) }),
    defineField({ name: "avatar", title: "Avatar", type: "image", options: { hotspot: true }, description: "Upload a customer photo (optional)" }),
  ],
});

export const faq = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({ name: "question", title: "Question", type: "string", validation: (r) => r.required() }),
    defineField({ name: "answer", title: "Answer", type: "text" }),
    defineField({ name: "order", title: "Order", type: "number" }),
  ],
});

export const gallery = defineType({
  name: "gallery",
  title: "Gallery Item",
  type: "document",
  fields: [
    defineField({ name: "image", title: "Image", type: "image", validation: (r) => r.required(), options: { hotspot: true }, description: "Upload a store photo" }),
    defineField({ name: "caption", title: "Caption", type: "string" }),
    defineField({ name: "order", title: "Order", type: "number" }),
  ],
});

export const offer = defineType({
  name: "offer",
  title: "Offer",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "badge", title: "Badge", type: "string" }),
    defineField({ name: "subtitle", title: "Subtitle", type: "string" }),
    defineField({ name: "discountText", title: "Discount Text", type: "string" }),
    defineField({ name: "image", title: "Image", type: "image", options: { hotspot: true }, description: "Upload an offer image" }),
    defineField({ name: "link", title: "Link", type: "url" }),
    defineField({ name: "cta", title: "CTA Text", type: "string" }),
    defineField({ name: "expiryDate", title: "Expiry Date", type: "date" }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: { list: ["general", "bento", "seasonal", "flash"], layout: "radio" },
      initialValue: "general",
    }),
  ],
});

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    slugField,
    defineField({ name: "seoDescription", title: "SEO Description", type: "text" }),
    defineField({ name: "content", title: "Content", type: "array", of: [{ type: "block" }] }),
  ],
});

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "companyName", title: "Company Name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "companyShortName", title: "Company Short Name", type: "string" }),
    defineField({ name: "tagline", title: "Tagline", type: "string" }),
    defineField({ name: "logo", title: "Logo", type: "image", options: { hotspot: true }, description: "Upload your shop logo" }),
    defineField({ name: "announcement", title: "Announcement", type: "string" }),
    defineField({ name: "phoneDisplay", title: "Phone (Display)", type: "string" }),
    defineField({ name: "phoneTel", title: "Phone (tel:)", type: "string" }),
    defineField({ name: "whatsappNumber", title: "WhatsApp Number", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "addressLine1", title: "Address Line 1", type: "string" }),
    defineField({ name: "addressLine2", title: "Address Line 2", type: "string" }),
    defineField({ name: "addressLine3", title: "Address Line 3", type: "string" }),
    defineField({ name: "addressLine4", title: "Address Line 4", type: "string" }),
    defineField({ name: "city", title: "City", type: "string" }),
    defineField({ name: "pincode", title: "Pincode", type: "string" }),
    defineField({ name: "hours", title: "Hours", type: "string" }),
    defineField({ name: "googleMapsEmbed", title: "Google Maps Embed URL", type: "url" }),
    defineField({ name: "facebookUrl", title: "Facebook URL", type: "url" }),
    defineField({ name: "instagramUrl", title: "Instagram URL", type: "url" }),
    defineField({ name: "youtubeUrl", title: "YouTube URL", type: "url" }),
    defineField({ name: "linkedinUrl", title: "LinkedIn URL", type: "url" }),
    defineField({ name: "footerText", title: "Footer Text", type: "text" }),
    defineField({ name: "copyrightText", title: "Copyright Text", type: "string" }),
    defineField({ name: "seoTitleTemplate", title: "SEO Title Template", type: "string" }),
    defineField({ name: "seoDescription", title: "SEO Description", type: "text" }),
    defineField({ name: "seoKeywords", title: "SEO Keywords", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "openGraphImage", title: "Open Graph Image", type: "image", options: { hotspot: true }, description: "Upload the image shown when sharing on social media" }),
  ],
});

export const homePage = defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  fields: [
    defineField({ name: "heroTitle", title: "Hero Title", type: "string" }),
    defineField({ name: "heroSubtitle", title: "Hero Subtitle", type: "text" }),
    defineField({ name: "heroSlides", title: "Hero Slides (image URLs)", type: "array", of: [{ type: "url" }] }),
    defineField({ name: "primaryCtaText", title: "Primary CTA Text", type: "string" }),
    defineField({ name: "primaryCtaLink", title: "Primary CTA Link", type: "string" }),
    defineField({ name: "secondaryCtaText", title: "Secondary CTA Text", type: "string" }),
    defineField({ name: "secondaryCtaLink", title: "Secondary CTA Link", type: "string" }),
    defineField({
      name: "featuredCarousel",
      title: "Featured Carousel",
      type: "array",
      of: [{ type: "reference", to: [{ type: "product" }] }],
    }),
    defineField({
      name: "topRatedPerformance",
      title: "Top Rated / Performance",
      type: "array",
      of: [{ type: "reference", to: [{ type: "product" }] }],
    }),
    defineField({
      name: "bentoDeals",
      title: "Bento Deals",
      type: "array",
      of: [{ type: "reference", to: [{ type: "offer" }] }],
    }),
  ],
});

export const schemaTypes = [
  product,
  brand,
  category,
  banner,
  testimonial,
  faq,
  gallery,
  offer,
  page,
  siteSettings,
  homePage,
];
