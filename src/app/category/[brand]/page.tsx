import { ProductCatalog } from "@/components/sections/product-catalog";
import { BrandFilter } from "@/components/sections/brand-filter";
import { Footer } from "@/components/sections/footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { formatPrice, getAllProducts } from "@/lib/data/products";
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

  // Unique, data-driven copy per brand: model count, real price band and the
  // most prominent models. Avoids the near-identical boilerplate every brand
  // page used to share while staying factually tied to the catalogue.
  const priceValues = filteredProducts
    .flatMap((p) => p.variants.map((v) => v.price))
    .filter((p): p is number => typeof p === "number" && p > 0);
  const minPrice = priceValues.length ? Math.min(...priceValues) : undefined;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : undefined;
  const priceRange =
    minPrice && maxPrice
      ? minPrice === maxPrice
        ? `around ${formatPrice(minPrice)}`
        : `from ${formatPrice(minPrice)} to ${formatPrice(maxPrice)}`
      : null;
  const topModels = filteredProducts.slice(0, 3).map((p) => p.name);
  const modelList =
    topModels.length > 1
      ? `${topModels.slice(0, -1).join(", ")} and ${topModels[topModels.length - 1]}`
      : topModels[0] || "";

  return (
    <>
      <main className="pt-20">
        <section className="border-b border-slate-200 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-10">
            <Breadcrumbs items={[{ label: "Mobiles", href: "/products" }, { label: brandInfo.name, href: `/category/${brandInfo.slug}` }]} className="mb-4" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {brandInfo.name} <span className="text-blue-600">Mobiles</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {filteredProducts.length} {filteredProducts.length === 1 ? "model" : "models"} available — genuine {brandInfo.name} smartphones with EMI, exchange, and local warranty in {storeCity}.
            </p>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-8">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 md:grid-cols-2 md:px-10">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {brandInfo.name} price list in {storeCity}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We stock {filteredProducts.length} {brandInfo.name}{" "}
                {filteredProducts.length === 1 ? "model" : "models"} in {storeCity}
                {priceRange ? `, priced ${priceRange}` : ""}.
                {modelList ? ` Popular picks include the ${modelList}.` : ""}{" "}
                Every phone is brand-new, comes with the official {brandInfo.name}
                warranty and a GST invoice.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Buy {brandInfo.name} in {storeCity}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Pay by 0% EMI on leading cards, exchange your old phone for a fair
                value, or ask on WhatsApp for today&apos;s best price. Stock and
                offers change daily, so call ahead if you want to see a specific
                model. Visit our store on Kurnool Road for a hands-on demo before
                you buy.
              </p>
            </div>
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
