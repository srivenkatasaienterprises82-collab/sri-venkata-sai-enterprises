import { Section } from "@/components/layout/section";
import { Footer } from "@/components/sections/footer";
import { siteConfig } from "@/lib/data/siteConfig";
import { safeSanityFetch } from "@/sanity/lib/live";
import { PAGE_QUERY } from "@/sanity/queries";
import { PortableText } from "@portabletext/react";
import type { SanityPage } from "@/sanity/types";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data: page } = await safeSanityFetch({ query: PAGE_QUERY, params: { slug: "privacy" } }) as { data: SanityPage | null };
    if (page?.title) {
      return { title: page.title, description: page.seoDescription || undefined, alternates: { canonical: "/privacy" } };
    }
  } catch {}
  return {
    title: "Privacy Policy",
    description: "How Sri Venkata Sai Enterprises collects, uses, stores, and protects visitor and order data.",
    alternates: { canonical: "/privacy" },
  };
}

const staticSections = [
  {
    title: "1. Information We Collect",
    body: [
      "We collect only the information needed to process your order and respond to your enquiries:",
      "• Contact details: your name, phone number, and (optionally) email address.",
      "• Delivery details: your city, pincode, and delivery address.",
      "• Order details: the product(s), variant, colour, quantity, and any notes you add.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    body: [
      "We use your information solely to:",
      "• Confirm availability, price, and offer eligibility for your order.",
      "• Coordinate delivery or store pickup.",
      "• Provide after-sales support and warranty assistance.",
      "We do not use your data for unsolicited marketing calls or messages.",
    ],
  },
  {
    title: "3. How We Share Your Information",
    body: [
      "When you place an order, your order details are shared with our team via WhatsApp and, where configured, a Google Sheets order log used for fulfilment and customer support.",
      "If your order is delivered, your name, phone, and address are shared with our trusted logistics partner for delivery only. We never sell or rent your personal data to any third party.",
    ],
  },
  {
    title: "4. Data Storage & Security",
    body: [
      "Order data is stored in our private order log and accessed only by authorised staff. Browsing data may be analysed in aggregate (e.g. via privacy-friendly analytics) to improve the website; it is not linked to your identity.",
    ],
  },
  {
    title: "5. Your Rights",
    body: [
      "You may request access to, correction of, or deletion of your personal data at any time. To exercise these rights, contact us using the details below and we will respond within a reasonable timeframe.",
    ],
  },
  {
    title: "6. Changes to This Policy",
    body: [
      "We may update this policy from time to time. Any changes will be posted on this page with an updated revision date.",
    ],
  },
];

export default async function PrivacyPage() {
  const { data: sanityPage } = await safeSanityFetch({ query: PAGE_QUERY, params: { slug: "privacy" } }) as { data: SanityPage | null };
  const hasContent = sanityPage?.content && Array.isArray(sanityPage.content) && sanityPage.content.length > 0;

  return (
    <>
      <main className="pt-24 bg-slate-50 min-h-screen">
        <Section>
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-medium text-slate-500">Last updated: June 2026</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {sanityPage?.title || "Privacy Policy"}
            </h1>
            <div className="mt-8 flex flex-col gap-8 text-slate-600 font-medium leading-relaxed">
              {hasContent ? (
                <div className="prose prose-slate max-w-none">
                  <PortableText
                    value={sanityPage!.content!}
                    components={{
                      block: {
                        h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mt-6 mb-3">{children}</h2>,
                        normal: ({ children }) => <p className="text-[15px] leading-relaxed mb-3">{children}</p>,
                      },
                    }}
                  />
                </div>
              ) : (
                <>
                  <p>
                    Sri Venkata Sai Enterprises (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your
                    privacy. This policy explains what we collect, why, and how we protect it.
                  </p>
                  {staticSections.map((s) => (
                    <div key={s.title}>
                      <h2 className="text-xl font-bold text-slate-900">{s.title}</h2>
                      <div className="mt-3 flex flex-col gap-2 text-[15px]">
                        {s.body.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mt-4">
                <h2 className="text-xl font-bold text-slate-900">Contact Us</h2>
                <p className="mt-3 text-[15px] font-medium text-slate-600">
                  For any privacy or data-related request, call us at{" "}
                  <a href={`tel:${siteConfig.phoneTel}`} className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 transition-colors">
                    {siteConfig.phoneDisplay}
                  </a>{" "}
                  or message us on{" "}
                  <a href={siteConfig.whatsappUrl} className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 transition-colors">
                    WhatsApp
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
