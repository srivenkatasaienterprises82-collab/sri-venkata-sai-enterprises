import { ProductCatalog } from "@/components/sections/product-catalog";
import { BrandFilter } from "@/components/sections/brand-filter";
import { Footer } from "@/components/sections/footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getAllProducts } from "@/lib/data/products";
import { getAllBrands, getBrandBySlug } from "@/lib/data/brands";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/data/siteConfig";
import type { Metadata } from "next";
import { safeSanityFetch } from "@/sanity/lib/live";
import { BRANDS_QUERY, PRODUCTS_BY_BRAND_QUERY } from "@/sanity/queries";
import { toBrands, toProducts } from "@/sanity/transform";
import { getSiteSettings } from "@/sanity/lib/settings";
import type { SanityBrand, SanityProduct } from "@/sanity/types";

interface CategoryPageProps {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { brand } = await params;
  const normalisedBrand = brand.toLowerCase();

  // Try to lookup brand in Sanity first
  let brandName = normalisedBrand;
  let count = 0;

  try {
    const [{ data: sanityBrands }, { data: sanityProducts }] = await Promise.all([
      safeSanityFetch({ query: BRANDS_QUERY }) as Promise<{ data: SanityBrand[] | null }>,
      safeSanityFetch({
        query: PRODUCTS_BY_BRAND_QUERY,
        params: { brandSlug: normalisedBrand },
      }) as Promise<{ data: SanityProduct[] | null }>,
    ]);

    const brands = sanityBrands?.length ? toBrands(sanityBrands) : getAllBrands();
    const brandInfo = brands.find((b) => b.slug === normalisedBrand);
    if (brandInfo) {
      brandName = brandInfo.name;
      count = sanityProducts?.length ? sanityProducts.length : getAllProducts().filter((p) => p.brandSlug === normalisedBrand).length;
    } else {
      const staticBrand = getBrandBySlug(normalisedBrand);
      if (staticBrand) {
        brandName = staticBrand.name;
        count = getAllProducts().filter((p) => p.brandSlug === normalisedBrand).length;
      } else {
        return { title: "Brand Not Found" };
      }
    }
  } catch {
    const staticBrand = getBrandBySlug(normalisedBrand);
    if (staticBrand) {
      brandName = staticBrand.name;
      count = getAllProducts().filter((p) => p.brandSlug === normalisedBrand).length;
    }
  }

  return {
    title: `${brandName} Mobiles in ${siteConfig.address.city} — ${count} Models`,
    description: `Browse ${count}+ genuine ${brandName} smartphones in ${siteConfig.address.city}. Best prices, EMI, exchange offers, and official warranty at ${siteConfig.storeName}.`,
    alternates: { canonical: `/category/${normalisedBrand}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { brand } = await params;
  const normalisedBrand = brand.toLowerCase();

  const [
    { data: sanityBrands },
    { data: sanityProducts },
    settings,
  ] = await Promise.all([
    safeSanityFetch({ query: BRANDS_QUERY }) as Promise<{ data: SanityBrand[] | null }>,
    safeSanityFetch({
      query: PRODUCTS_BY_BRAND_QUERY,
      params: { brandSlug: normalisedBrand },
    }) as Promise<{ data: SanityProduct[] | null }>,
    getSiteSettings(),
  ]);

  const brands = sanityBrands?.length ? toBrands(sanityBrands) : getAllBrands();
  const brandInfo = brands.find((b) => b.slug === normalisedBrand) || getBrandBySlug(normalisedBrand);

  if (!brandInfo) {
    notFound();
  }

  const filteredProducts = sanityProducts?.length
    ? toProducts(sanityProducts)
    : getAllProducts().filter((p) => p.brandSlug === normalisedBrand);

  const storeCity = settings?.city || siteConfig.address.city;

  return (
    <>
      <main className="pt-20">
        <section className="border-b border-slate-200 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
            <Breadcrumbs items={[{ label: "Mobiles", href: "/products" }, { label: brandInfo.name, href: `/products?brand=${brandInfo.slug}` }]} className="mb-4" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {brandInfo.name} <span className="text-blue-600">Mobiles</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {filteredProducts.length} {filteredProducts.length === 1 ? "model" : "models"} available — genuine {brandInfo.name} smartphones with EMI, exchange, and local warranty in {storeCity}.
            </p>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-6">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
            <BrandFilter brands={brands} activeBrand={normalisedBrand} />
          </div>
        </section>

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
