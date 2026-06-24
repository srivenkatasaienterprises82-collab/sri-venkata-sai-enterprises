import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { BrandStrip } from "@/components/sections/brand-strip";
import { BrandCarousel } from "@/components/sections/brand-carousel";
import { BentoDeals } from "@/components/sections/bento-deals";
import { BestSelling } from "@/components/sections/best-selling";

import { TopRatedPerformance } from "@/components/sections/top-rated-performance";
import { ProductGrid } from "@/components/sections/product-grid";
import { Testimonials } from "@/components/sections/testimonials";
import { FAQ } from "@/components/sections/faq";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { faqs as defaultFaqs } from "@/lib/data/faq";
import { safeSanityFetch } from "@/sanity/lib/live";
import {
  PRODUCTS_QUERY,
  BRANDS_QUERY,
  TESTIMONIALS_QUERY,
  HOME_PAGE_QUERY,
  FAQS_QUERY,
} from "@/sanity/queries";
import { toProducts, toBrands, toTestimonials, toFaqs } from "@/sanity/transform";
import { getAllProducts } from "@/lib/data/products";
import { getAllTestimonials } from "@/lib/data/testimonials";
import { getFeaturedBrands } from "@/lib/data/brands";
import { getSiteSettings } from "@/sanity/lib/settings";
import type { SanityHomePage, SanityBrand, SanityProduct, SanityTestimonial, SanityFaq } from "@/sanity/types";
 
export const dynamic = "force-dynamic";
 
export default async function Home() {
  const [
    { data: sanityHomePage },
    { data: sanityBrands },
    { data: sanityProducts },
    { data: sanityTestimonials },
    { data: sanityFaqs },
    settings,
  ] = await Promise.all([
    safeSanityFetch({ query: HOME_PAGE_QUERY }) as Promise<{ data: SanityHomePage | null }>,
    safeSanityFetch({ query: BRANDS_QUERY }) as Promise<{ data: SanityBrand[] | null }>,
    safeSanityFetch({ query: PRODUCTS_QUERY }) as Promise<{ data: SanityProduct[] | null }>,
    safeSanityFetch({ query: TESTIMONIALS_QUERY }) as Promise<{ data: SanityTestimonial[] | null }>,
    safeSanityFetch({ query: FAQS_QUERY }) as Promise<{ data: SanityFaq[] | null }>,
    getSiteSettings(),
  ]);

  // Transform Sanity arrays with fallbacks
  const products = sanityProducts?.length ? toProducts(sanityProducts) : getAllProducts();
  const brands = sanityBrands?.length ? toBrands(sanityBrands) : getFeaturedBrands();
  const testimonials = sanityTestimonials?.length ? toTestimonials(sanityTestimonials) : getAllTestimonials();
  const faqs = sanityFaqs?.length ? toFaqs(sanityFaqs) : defaultFaqs;

  // Resolve Home Page CMS configurations with fallbacks
  const heroTitle = sanityHomePage?.heroTitle || undefined;
  const heroSubtitle = sanityHomePage?.heroSubtitle || undefined;
  const heroSlides = sanityHomePage?.heroSlides;
  const primaryCtaText = sanityHomePage?.primaryCtaText || undefined;
  const primaryCtaLink = sanityHomePage?.primaryCtaLink || undefined;
  const secondaryCtaText = sanityHomePage?.secondaryCtaText || undefined;
  const secondaryCtaLink = sanityHomePage?.secondaryCtaLink || undefined;

  const heroProducts = sanityHomePage?.featuredCarousel?.length
    ? toProducts(sanityHomePage.featuredCarousel)
    : products;

  const topRatedProducts = sanityHomePage?.topRatedPerformance?.length
    ? toProducts(sanityHomePage.topRatedPerformance)
    : undefined;

  const bentoDeals = sanityHomePage?.bentoDeals || undefined;

  return (
    <>
      {/* FAQ structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.answer,
              },
            })),
          }),
        }}
      />
      <main>
        <HeroSection
          products={heroProducts}
          title={heroTitle}
          subtitle={heroSubtitle}
          primaryCtaText={primaryCtaText}
          primaryCtaLink={primaryCtaLink}
          secondaryCtaText={secondaryCtaText}
          secondaryCtaLink={secondaryCtaLink}
        />
        <BrandStrip brands={brands} />
        <BrandCarousel />
        <ProductGrid products={products} />
        <BestSelling products={products} />

        <TopRatedPerformance products={topRatedProducts} />
        <BentoDeals offers={bentoDeals} />
        <TrustStrip />
        <Testimonials testimonials={testimonials} />
        <FAQ items={faqs} />
        <ContactSection settings={settings} />
      </main>
      <Footer settings={settings} brands={brands} />
    </>
  );
}
