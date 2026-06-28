import dynamic from "next/dynamic";
import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { BrandStrip } from "@/components/sections/brand-strip";
import { BrandCarousel } from "@/components/sections/brand-carousel";
import { PromoBannerGrid } from "@/components/sections/promo-banner-grid";
import { BestSelling } from "@/components/sections/best-selling";
import { ProductGrid } from "@/components/sections/product-grid";
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
import { siteConfig } from "@/lib/data/siteConfig";
import type { SanityHomePage, SanityBrand, SanityProduct, SanityTestimonial, SanityFaq } from "@/sanity/types";
import type { Metadata } from "next";

// ── Lazy-loaded below-the-fold sections (code-split via dynamic import) ──
const BentoDeals = dynamic(() => import("@/components/sections/bento-deals"));
const Testimonials = dynamic(() => import("@/components/sections/testimonials").then(m => ({ default: m.Testimonials })));
const FAQ = dynamic(() => import("@/components/sections/faq").then(m => ({ default: m.FAQ })));
const ContactSection = dynamic(() => import("@/components/sections/contact-section"));



export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://srivenkatasaienterprises.com";

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

      {/* LocalBusiness / ElectronicsStore structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["ElectronicsStore", "LocalBusiness"],
            "@id": `${baseUrl}/#business`,
            name: siteConfig.storeName,
            image: `${baseUrl}/logo.jpg`,
            url: baseUrl,
            telephone: siteConfig.phoneTel,
            address: {
              "@type": "PostalAddress",
              streetAddress: `${siteConfig.address.line2}, ${siteConfig.address.line3}`,
              addressLocality: siteConfig.address.city,
              addressRegion: "Andhra Pradesh",
              postalCode: siteConfig.address.pincode,
              addressCountry: "IN",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: 15.5127,
              longitude: 80.0389,
            },
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday", "Tuesday", "Wednesday", "Thursday",
                "Friday", "Saturday", "Sunday",
              ],
              opens: "10:00",
              closes: "21:00",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: siteConfig.ratingValue,
              reviewCount: siteConfig.reviewCount,
              bestRating: 5,
            },
            priceRange: "₹₹",
          }),
        }}
      />

      {/* Organization structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${baseUrl}/#org`,
            name: siteConfig.storeName,
            url: baseUrl,
            logo: `${baseUrl}/logo.jpg`,
            sameAs: [
              "https://www.instagram.com/sri_venkata_sai_enterprises/",
              siteConfig.address.googleMapsUrl,
              siteConfig.ratingSourceUrl,
            ],
          }),
        }}
      />

      {/* WebSite structured data (enables sitelinks search box) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${baseUrl}/#website`,
            name: siteConfig.storeName,
            url: baseUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${baseUrl}/products?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      {/* BreadcrumbList for homepage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: baseUrl,
              },
            ],
          }),
        }}
      />

      <>
        <HeroSection
          products={heroProducts}
          title={heroTitle}
          subtitle={heroSubtitle}
          primaryCtaText={primaryCtaText}
          primaryCtaLink={primaryCtaLink}
          secondaryCtaText={secondaryCtaText}
          secondaryCtaLink={secondaryCtaLink}
        />
      <PromoBannerGrid />
      <ProductGrid products={products} />
      <BrandStrip brands={brands} />
      <BrandCarousel />
        <BestSelling products={products} />

        <BentoDeals offers={bentoDeals} />
        <TrustStrip />
        <Testimonials testimonials={testimonials} />
        <FAQ items={faqs} />
        <ContactSection settings={settings} />
      </>
      <Footer settings={settings} brands={brands} />
    </>
  );
}
