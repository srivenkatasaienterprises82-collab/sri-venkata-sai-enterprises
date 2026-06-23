import { Section } from "@/components/layout/section";
import { Footer } from "@/components/sections/footer";
import { siteConfig } from "@/lib/data/siteConfig";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using the Sri Venkata Sai Enterprises website, including pricing, ordering, warranty, and support.",
  alternates: { canonical: "/terms" },
};

const sections = [
  {
    title: "1. Pricing & Availability",
    body: [
      "All prices shown on this website are indicative and subject to change without notice. Prices marked “Price on Enquiry” are confirmed on WhatsApp or at the store. Final pricing, including applicable taxes and any active offers, is confirmed at the time of purchase.",
      "Product availability, colours, and storage variants may vary. We will confirm real-time stock before confirming your order.",
    ],
  },
  {
    title: "2. Orders & Confirmation",
    body: [
      "Orders placed through this website are enquiry-based and are confirmed via WhatsApp or phone. No payment is taken online at the time of order submission. We recommend retaining all order-related messages for future support.",
    ],
  },
  {
    title: "3. Payment, EMI & Exchange",
    body: [
      "Payment is made at the store or on delivery as mutually agreed. EMI options are provided through leading banks and NBFCs and are subject to their approval and terms. Exchange values for old devices are assessed on inspection of the device and are subject to its condition.",
    ],
  },
  {
    title: "4. Warranty & Support",
    body: [
      "All smartphones carry the official brand warranty (typically 1 year) as per the manufacturer’s service policy. Warranty and support claims are handled through the brand’s authorised service centres and are subject to verification at our store.",
    ],
  },
  {
    title: "5. Returns & Refunds",
    body: [
      "As sealed electronic goods, smartphones are non-returnable once unboxed unless defective and covered under the brand’s warranty or applicable consumer protection law. Please inspect your device at the time of purchase or delivery.",
    ],
  },
  {
    title: "6. Website Use",
    body: [
      "Content on this website (product names, specifications, and images) is provided for information and may be updated at any time. Trademarks and brand names belong to their respective owners and are used here for identification only.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <main className="pt-24 bg-slate-50 min-h-screen">
        <Section>
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-medium text-slate-500">Last updated: June 2026</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Terms of Service
            </h1>
            <div className="mt-8 flex flex-col gap-8 text-slate-600 font-medium leading-relaxed">
              <p>
                These terms govern your use of the {siteConfig.storeName} website and the orders you
                place through it. By using this site, you agree to the terms below.
              </p>
              {sections.map((s) => (
                <div key={s.title}>
                  <h2 className="text-xl font-bold text-slate-900">{s.title}</h2>
                  <div className="mt-3 flex flex-col gap-2 text-[15px]">
                    {s.body.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mt-4">
                <h2 className="text-xl font-bold text-slate-900">Questions?</h2>
                <p className="mt-3 text-[15px] font-medium text-slate-600">
                  For any questions about these terms, call us at{" "}
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
