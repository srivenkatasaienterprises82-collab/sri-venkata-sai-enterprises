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



export default function Home() {
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
        <HeroSection />
        <BestSelling />
        <PromoBanners />
        <TrustStrip />
        <BrandStrip />
        <TopRatedPerformance />
        <BentoDeals />
        <ProductGrid />
        <Testimonials />
        <FAQ />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
