import { ProductDetail } from "@/components/sections/product-detail";
import { Footer } from "@/components/sections/footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getProductBySlug } from "@/lib/data/products";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/data/siteConfig";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";

async function getGalleryImages(imageFolder: string, fallbackImage: string): Promise<string[]> {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const product = getProductBySlug(resolvedParams.id);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const price = product.variants.find((variant) => variant.price)?.price;
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
  const product = getProductBySlug(resolvedParams.id);
  
  if (!product) {
    notFound();
  }

  const galleryImages = await getGalleryImages(product.imageFolder, product.image);

  return (
    <>
      <main className="pt-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10 pt-6">
          <Breadcrumbs items={[{ label: "Mobiles", href: "/products" }, { label: product.name, href: `/products/${product.slug}` }]} />
        </div>
        <ProductDetail product={product} galleryImages={galleryImages} />
      </main>
      <Footer />
    </>
  );
}
