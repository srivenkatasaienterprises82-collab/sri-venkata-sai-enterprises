import { Section } from "@/components/layout/section";
import { ContactSection } from "@/components/sections/contact-section";
import { Footer } from "@/components/sections/footer";
import { GradientText } from "@/components/ui/gradient-text";
import { siteConfig } from "@/lib/data/siteConfig";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    `Visit our store in ${siteConfig.address.city} or reach us on WhatsApp. ${siteConfig.address.line2}, ${siteConfig.address.line3}, ${siteConfig.address.line4}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
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
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
