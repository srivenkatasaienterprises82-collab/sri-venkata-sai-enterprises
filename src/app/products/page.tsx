import { GradientText } from "@/components/ui/gradient-text";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getAllProducts } from "@/lib/data/products";
import { getAllBrands } from "@/lib/data/brands";
import { Footer } from "@/components/sections/footer";
import { BrandFilter } from "@/components/sections/brand-filter";
import { ProductCatalog } from "@/components/sections/product-catalog";
import { siteConfig } from "@/lib/data/siteConfig";
import type { Metadata } from "next";
import { safeSanityFetch } from "@/sanity/lib/live";
import { PRODUCTS_QUERY, BRANDS_QUERY } from "@/sanity/queries";
import { toProducts, toBrands } from "@/sanity/transform";
import { getSiteSettings } from "@/sanity/lib/settings";
import type { SanityProduct, SanityBrand } from "@/sanity/types";
export const metadata: Metadata = {
  title: `Mobiles & Smartphones in ${siteConfig.address.city}`,
  description:
    `Browse 100+ genuine smartphones in ${siteConfig.address.city} from Apple, Samsung, Vivo, iQOO, Oppo, Motorola, OnePlus & Realme. Best prices, EMI options, exchange offers & local warranty.`,
  alternates: { canonical: "/products" },
};

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const params = await searchParams;
  const activeBrand = params.brand?.toLowerCase() || null;

  const [
    { data: sanityProducts },
    { data: sanityBrands },
    settings,
  ] = await Promise.all([
    safeSanityFetch({ query: PRODUCTS_QUERY }) as Promise<{ data: SanityProduct[] | null }>,
    safeSanityFetch({ query: BRANDS_QUERY }) as Promise<{ data: SanityBrand[] | null }>,
    getSiteSettings(),
  ]);

  const allProducts = sanityProducts?.length ? toProducts(sanityProducts) : getAllProducts();
  const brands = sanityBrands?.length ? toBrands(sanityBrands) : getAllBrands();

  const filteredProducts = activeBrand
    ? allProducts.filter((p) => p.brandSlug === activeBrand)
    : allProducts;

  const storeCity = settings?.city || siteConfig.address.city;

  return (
    <>
      <main className="pt-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10 pt-6">
          <Breadcrumbs />
        </div>
        {/* Page header */}
        <section className="border-b border-slate-200 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
            <div className="max-w-3xl">
              <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-blue-600">
                Store catalog
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Our <GradientText>Mobiles</GradientText>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Browse genuine smartphones with personal buying help. Every
                device includes warranty and local support in {storeCity}.
              </p>
            </div>
          </div>
        </section>

        {/* Brand filters (server-rendered for SEO) */}
        <section className="border-b border-slate-200 bg-white py-6">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
            <BrandFilter brands={brands} activeBrand={activeBrand} />
          </div>
        </section>

        {/* Catalogue client (search + price + availability filters) */}
        <section className="min-h-screen bg-slate-50 py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
            <ProductCatalog products={filteredProducts} />
          </div>
        </section>
      </main>
      <Footer settings={settings} brands={brands} />
    </>
  );
}
