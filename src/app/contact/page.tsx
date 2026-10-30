import { Section } from "@/components/layout/section";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { GradientText } from "@/components/ui/gradient-text";
import { siteConfig } from "@/lib/data/siteConfig";
import { getSiteSettings } from "@/sanity/lib/settings";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    `Visit our store in ${siteConfig.address.city} or reach us on WhatsApp. ${siteConfig.address.line2}, ${siteConfig.address.line3}, ${siteConfig.address.line4}.`,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  // Read contact details from Sanity so this page cannot drift from the
  // nav/footer (it previously rendered the static fallback number instead).
  const settings = await getSiteSettings();

  return (
    <>
      <main className="pt-20">
        <Section className="border-b border-slate-200 bg-slate-50">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Get in <GradientText>Touch</GradientText>
          </h1>
          <p className="mt-3 max-w-xl text-slate-600">
            Visit our store, call us, or WhatsApp for instant help with your purchase.
          </p>
        </Section>
        <ContactSection settings={settings} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
