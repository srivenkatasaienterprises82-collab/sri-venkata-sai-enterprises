import { defineQuery } from "next-sanity";

export const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0]{
  companyName, companyShortName, tagline, "logo": logo.asset->url, announcement,
  phoneDisplay, phoneTel, whatsappNumber, email,
  addressLine1, addressLine2, addressLine3, addressLine4, city, pincode,
  hours, googleMapsEmbed,
  facebookUrl, instagramUrl, youtubeUrl, linkedinUrl,
  footerText, copyrightText,
  seoTitleTemplate, seoDescription, seoKeywords, "openGraphImage": openGraphImage.asset->url
}`);

export const HOME_PAGE_QUERY = defineQuery(`*[_type == "homePage"][0]{
  heroTitle, heroSubtitle,
  "heroSlides": heroSlides[].asset->url,
  primaryCtaText, primaryCtaLink,
  secondaryCtaText, secondaryCtaLink,
  "featuredCarousel": featuredCarousel[]->{
    _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
    "brand": brand->{name, slug},
    "brandSlug": brand->slug.current,
    "coverImage": coverImage.asset->url,
    featured, description,
    colors, variants, specifications
  },
  "topRatedPerformance": topRatedPerformance[]->{
    _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
    "brand": brand->{name, slug},
    "brandSlug": brand->slug.current,
    "coverImage": coverImage.asset->url,
    featured, description,
    colors, variants, specifications
  },
  "bentoDeals": bentoDeals[]->{
    _id, title, badge, subtitle, discountText, "image": image.asset->url, link, cta, expiryDate, type
  }
}`);

export const PRODUCTS_QUERY = defineQuery(`*[_type == "product" && enabled != false] | order(order asc){
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "category": category->{name, slug},
  "categorySlug": category->slug.current,
  "coverImage": coverImage.asset->url,
  featured, description,
  colors, variants, specifications
}`);

export const FEATURED_PRODUCTS_QUERY = defineQuery(`*[_type == "product" && featured == true && enabled != false] | order(order asc){
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "category": category->{name, slug},
  "categorySlug": category->slug.current,
  "coverImage": coverImage.asset->url,
  featured, description,
  colors, variants, specifications
}`);

export const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[_type == "product" && (slug.current == $slug || _id == $id) && enabled != false][0]{
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "category": category->{name, slug},
  "categorySlug": category->slug.current,
  "coverImage": coverImage.asset->url,
  "images": images[].asset->url,
  featured, description,
  colors, variants, specifications
}`);

export const PRODUCTS_BY_BRAND_QUERY = defineQuery(`*[_type == "product" && brand->slug.current == $brandSlug && enabled != false] | order(order asc){
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "coverImage": coverImage.asset->url
}`);

export const CATEGORIES_QUERY = defineQuery(`*[_type == "category"] | order(name asc){
  _id, name, slug, "image": image.asset->url, description
}`);

export const BRANDS_QUERY = defineQuery(`*[_type == "brand" && hidden != true] | order(order asc){
  _id, name, slug, "logo": logo.asset->url, description, featured
}`);

export const BANNERS_QUERY = defineQuery(`*[_type == "banner" && active == true] | order(order asc){
  _id, title, subtitle, badge, cta, backgroundColor,
  "image": image.asset->url, link
}`);

export const TESTIMONIALS_QUERY = defineQuery(`*[_type == "testimonial"]{
  _id, name, quote, rating, "avatar": avatar.asset->url
}`);

export const FAQS_QUERY = defineQuery(`*[_type == "faq"] | order(order asc){
  _id, question, answer
}`);

export const GALLERY_QUERY = defineQuery(`*[_type == "gallery"] | order(order asc){
  _id, "image": image.asset->url, caption
}`);
