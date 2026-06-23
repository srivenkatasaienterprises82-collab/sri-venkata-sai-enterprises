import { HeroSection } from "@/components/sections/hero-section";
import { TrustStrip } from "@/components/sections/trust-strip";
import { BrandStrip } from "@/components/sections/brand-strip";
import { BentoDeals } from "@/components/sections/bento-deals";
import { BestSelling } from "@/components/sections/best-selling";
import PromoBanners from "@/components/sections/promo-banners";
import { TopRatedPerformance } from "@/components/sections/top-rated-performance";
import { ProductGrid } from "@/components/sections/product-grid";
import { Testimonials } from "@/components/sections/testimonials";
import { FAQ } from "@/components/sections/faq";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { faqs } from "@/lib/data/faq";
import { sanityFetch } from "@/sanity/lib/live";
import {
  PRODUCTS_QUERY,
  CATEGORIES_QUERY,
  TESTIMONIALS_QUERY,
} from "@/sanity/queries";
import { toProducts, toBrands, toTestimonials } from "@/sanity/transform";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ data: sanityProducts }, { data: categories }, { data: testimonialsData }] =
    await Promise.all([
      sanityFetch({ query: PRODUCTS_QUERY }) as Promise<{ data: any[] }>,
      sanityFetch({ query: CATEGORIES_QUERY }) as Promise<{ data: any[] }>,
      sanityFetch({ query: TESTIMONIALS_QUERY }) as Promise<{ data: any[] }>,
    ]);

  const products = toProducts(sanityProducts);
  const brands = toBrands(categories);
  const testimonials = toTestimonials(testimonialsData);

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
        <HeroSection products={products} />
        <BestSelling products={products} />
        <PromoBanners />
        <TrustStrip />
        <BrandStrip brands={brands} />
        <TopRatedPerformance />
        <BentoDeals />
        <ProductGrid products={products} />
        <Testimonials testimonials={testimonials} />
        <FAQ />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
