import { ProductDetail } from "@/components/sections/product-detail";
import { Footer } from "@/components/sections/footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getStartingPrice } from "@/lib/data/products";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/data/siteConfig";
import type { Metadata } from "next";
import { sanityFetchNoCache } from "@/sanity/lib/live";
import { PRODUCT_BY_SLUG_QUERY } from "@/sanity/queries";
import { toProduct } from "@/sanity/transform";
import { resolveImage } from "@/sanity/lib/image";
import { getSiteSettings } from "@/sanity/lib/settings";
import type { SanityProduct } from "@/sanity/types";

// The product detail page is price-sensitive. Force a fresh render for
// every request so updated Sanity documents are reflected immediately
// after the owner publishes (or the price-sync action runs), with no cache.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Products exist only in Sanity. A slug that Sanity does not know is a 404 —
 * there is no static catalogue to fall back to any more.
 */
async function fetchProduct(param: string): Promise<SanityProduct | null> {
  try {
    const { data } = (await sanityFetchNoCache({
      query: PRODUCT_BY_SLUG_QUERY,
      params: { slug: param, id: param },
    })) as { data: SanityProduct | null };
    return data;
  } catch (err) {
    console.warn(
      `⚠️ Failed to fetch product slug ${param} from Sanity: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sanityProduct = await fetchProduct(id);

  if (!sanityProduct) {
    return {
      title: "Product Not Found",
    };
  }

  const product = toProduct(sanityProduct);
  const price = getStartingPrice(product);
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
  const { id } = await params;
  const sanityProduct = await fetchProduct(id);

  if (!sanityProduct) {
    notFound();
  }

  const product = toProduct(sanityProduct);
  const settings = await getSiteSettings();

  const galleryImages = sanityProduct.images?.length
    ? sanityProduct.images.map(resolveImage).filter(Boolean)
    : [product.image];

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
