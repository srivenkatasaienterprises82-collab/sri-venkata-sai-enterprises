import { ProductDetail } from "@/components/sections/product-detail";
import { Footer } from "@/components/sections/footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getProductBySlug } from "@/lib/data/products";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/data/siteConfig";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { sanityFetch } from "@/sanity/lib/live";
import { PRODUCT_BY_SLUG_QUERY } from "@/sanity/queries";
import { toProduct } from "@/sanity/transform";
import { getSiteSettings } from "@/sanity/lib/settings";
import type { Product, ProductVariant } from "@/lib/data/products";
import type { SanityProduct } from "@/sanity/types";

async function getGalleryImages(imageFolder: string, fallbackImage: string): Promise<string[]> {
  if (!imageFolder) return [fallbackImage];
  const dir = path.join(process.cwd(), "public", "images", "products", imageFolder);
  try {
    const files = await fs.promises.readdir(dir);
    const images = files
      .filter(f => /\.(webp|jpg|jpeg|png|avif)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)/)?.[1] || "0", 10);
        const numB = parseInt(b.match(/(\d+)/)?.[1] || "0", 10);
        return numA - numB;
      })
      .map(f => `/images/products/${imageFolder}/${f}`);
    return images.length > 0 ? images : [fallbackImage];
  } catch {
    return [fallbackImage];
  }
}

async function fetchProduct(slug: string): Promise<{ product: Product; isSanity: boolean } | null> {
  try {
    const { data: sanityProduct } = await sanityFetch({
      query: PRODUCT_BY_SLUG_QUERY,
      params: { slug },
    }) as { data: SanityProduct | null };

    if (sanityProduct) {
      return { product: toProduct(sanityProduct), isSanity: true };
    }
  } catch (err) {
    console.warn(`⚠️ Failed to fetch product slug ${slug} from Sanity:`, err);
  }

  // Fallback to static data
  const staticProduct = getProductBySlug(slug);
  if (staticProduct) {
    return { product: staticProduct, isSanity: false };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await fetchProduct(resolvedParams.id);

  if (!data) {
    return {
      title: "Product Not Found",
    };
  }

  const { product } = data;
  const price = product.variants.find((variant: ProductVariant) => variant.price)?.price;
  const priceText = price ? ` from ₹${price.toLocaleString("en-IN")}` : "";

  return {
    title: `${product.name}${priceText} in ${siteConfig.address.city}`,
    description: `${product.name} by ${product.brand} available at ${siteConfig.storeName}, ${siteConfig.address.city}. Check price, variants, EMI, exchange offers, warranty, and local delivery.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} in ${siteConfig.address.city}`,
      description: `Buy ${product.name} with EMI, exchange offers, GST invoice, and local support in ${siteConfig.address.city}.`,
      images: [{ url: product.image, alt: product.name }],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const data = await fetchProduct(resolvedParams.id);
  
  if (!data) {
    notFound();
  }

  const { product, isSanity } = data;
  const settings = await getSiteSettings();

  // Resolve gallery images
  let galleryImages: string[] = [product.image];
  if (isSanity) {
    // If it's a Sanity product, it has CDN gallery images in it.
    // Let's refetch Sanity images directly (PRODUCT_BY_SLUG_QUERY returns images in s.images)
    try {
      const { data: rawSanityProduct } = await sanityFetch({
        query: PRODUCT_BY_SLUG_QUERY,
        params: { slug: resolvedParams.id },
      }) as { data: SanityProduct | null };
      if (rawSanityProduct?.images?.length) {
        galleryImages = rawSanityProduct.images;
      }
    } catch {
      // Keep single cover image
    }
  } else {
    // Fallback to reading public local directories
    galleryImages = await getGalleryImages(product.imageFolder, product.image);
  }

  return (
    <>
      <main className="pt-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10 pt-6">
          <Breadcrumbs items={[{ label: "Mobiles", href: "/products" }, { label: product.name, href: `/products/${product.slug}` }]} />
        </div>
        <ProductDetail product={product} galleryImages={galleryImages} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
