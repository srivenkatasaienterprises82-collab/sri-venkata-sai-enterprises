import { defineQuery } from "next-sanity";

export const PRODUCTS_QUERY = defineQuery(`*[_type == "product"] | order(name asc){
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "coverImage": coverImage.asset->url,
  featured, description,
  colors, variants, specifications
}`);

export const FEATURED_PRODUCTS_QUERY = defineQuery(`*[_type == "product" && featured == true] | order(name asc){
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "coverImage": coverImage.asset->url,
  featured, description,
  colors, variants, specifications
}`);

export const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug][0]{
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "coverImage": coverImage.asset->url,
  "images": images[].asset->url,
  featured, description,
  colors, variants, specifications
}`);

export const PRODUCTS_BY_BRAND_QUERY = defineQuery(`*[_type == "product" && brand->slug.current == $brandSlug] | order(name asc){
  _id, name, slug, type, stock, price, originalPrice, priceOnEnquiry,
  "brand": brand->{name, slug},
  "brandSlug": brand->slug.current,
  "coverImage": coverImage.asset->url
}`);

export const CATEGORIES_QUERY = defineQuery(`*[_type == "category"] | order(name asc){
  _id, name, slug, "logo": logo.asset->url, description
}`);

export const BANNERS_QUERY = defineQuery(`*[_type == "banner" && active == true] | order(order asc){
  _id, title, subtitle, badge, cta, backgroundColor,
  "image": image.asset->url, link
}`);

export const TESTIMONIALS_QUERY = defineQuery(`*[_type == "testimonial"]{
  _id, name, quote, rating, "avatar": avatar.asset->url
}`);

export const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{
  _id, title, content, seoDescription
}`);
