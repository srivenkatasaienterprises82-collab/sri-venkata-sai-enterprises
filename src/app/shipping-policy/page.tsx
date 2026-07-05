import { Section } from "@/components/layout/section";
import { Footer } from "@/components/sections/footer";
import { GradientText } from "@/components/ui/gradient-text";
import { Truck, PackageCheck, RefreshCw, Clock, ShieldCheck, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";
import { safeSanityFetch } from "@/sanity/lib/live";
import { PAGE_QUERY } from "@/sanity/queries";
import { PortableText } from "@portabletext/react";
import type { SanityPage } from "@/sanity/types";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data: page } = await safeSanityFetch({ query: PAGE_QUERY, params: { slug: "shipping-policy" } }) as { data: SanityPage | null };
    if (page?.title) {
      return { title: page.title, description: page.seoDescription || undefined, alternates: { canonical: "/shipping-policy" } };
    }
  } catch {}
  return {
    title: `Shipping Policy | ${siteConfig.storeName} \u2014 ${siteConfig.address.city}`,
    description:
      `Free delivery across ${siteConfig.address.city} and Andhra Pradesh. Local pickup available. 1-year warranty on all smartphones. Exchange and EMI terms explained.`,
    alternates: { canonical: "/shipping-policy" },
  };
}

const staticPolicies = [
  { icon: Truck, title: "Free Local Delivery", body: `Free doorstep delivery within ${siteConfig.address.city} city limits. Orders placed before 6 PM are usually delivered the same day or next morning.` },
  { icon: MapPin, title: "Andhra Pradesh Delivery", body: "We ship across Andhra Pradesh via trusted courier partners. Delivery typically takes 2\u20134 business days. Tracking details are shared via WhatsApp." },
  { icon: PackageCheck, title: "What You Get", body: "Every order includes the phone in its original sealed box, original charger, data cable, SIM ejector, warranty card, and a GST invoice." },
  { icon: ShieldCheck, title: "Warranty", body: `All smartphones come with the official manufacturer warranty (typically 1 year). Warranty claims are handled directly through the brand's service centre in ${siteConfig.address.city} or Vijayawada.` },
  { icon: RefreshCw, title: "Exchange", body: "Bring your old phone to the store for a fair exchange valuation. Exchange discounts are applied at checkout. Online estimates are indicative \u2014 final value is confirmed in-store." },
  { icon: Clock, title: "EMI Terms", body: "0% EMI available on select cards and NBFCs. Tenure ranges from 3 to 12 months. EMI eligibility is subject to bank/NBFC approval at checkout." },
];

export default async function ShippingPolicyPage() {
  const { data: sanityPage } = await safeSanityFetch({ query: PAGE_QUERY, params: { slug: "shipping-policy" } }) as { data: SanityPage | null };
  const hasContent = sanityPage?.content && Array.isArray(sanityPage.content) && sanityPage.content.length > 0;

  return (
    <>
      <main className="pt-20">
        <Section className="border-b border-slate-200 bg-slate-50">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Shipping & <GradientText>Delivery Policy</GradientText>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            We aim to make receiving your new phone as pleasant as buying it. Here is everything you need to know about delivery, warranty, exchange, and EMI.
          </p>
        </Section>

        <Section spacing="lg">
          <div className="mx-auto max-w-5xl">
            {hasContent ? (
              <div className="prose prose-slate max-w-none">
                <PortableText
                  value={sanityPage!.content!}
                  components={{
                    block: {
                      h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">{children}</h2>,
                      normal: ({ children }) => <p className="text-sm leading-relaxed text-slate-600 mb-4">{children}</p>,
                    },
                  }}
                />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {staticPolicies.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section spacing="sm" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Questions?</h2>
            <p className="mt-2 text-slate-600">Reach out before you order and we will clarify anything.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={`tel:${siteConfig.phoneTel}`} className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Call {siteConfig.phoneDisplay}
              </a>
              <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
                WhatsApp Us
              </a>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
