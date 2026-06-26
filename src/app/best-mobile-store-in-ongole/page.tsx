import { Section } from "@/components/layout/section";
import { Footer } from "@/components/sections/footer";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/data/siteConfig";
import Link from "next/link";
import { MapPin, Phone, MessageCircle, Star, ShieldCheck, Banknote } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Best Mobile Store in Ongole | ${siteConfig.storeName}`,
  description:
    `Looking for the best mobile shop in Ongole? ${siteConfig.storeName} is your trusted smartphone showroom in Ongole. Buy iPhone, Samsung, Vivo, Oppo, Realme, OnePlus, Redmi and accessories at the best prices.`,
  alternates: { canonical: "/best-mobile-store-in-ongole" },
};

export default function LocationPage() {
  return (
    <>
      <main className="pt-20 bg-white">
        {/* ── Hero ── */}
        <Section className="border-b border-slate-200">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                The Best <GradientText>Mobile Store in Ongole</GradientText>
              </h1>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-lg">
                Are you searching for a reliable <span className="font-semibold text-slate-900">mobile shop in Ongole</span>? 
                {siteConfig.storeName} is the premier destination for genuine smartphones and accessories. 
                Experience top-notch service and unbeatable prices at the leading smartphone showroom in the city.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button as={Link} href="/products" variant="primary">
                  Browse Our Mobiles
                </Button>
                <Button
                  as="a"
                  href={siteConfig.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat on WhatsApp
                </Button>
              </div>
            </div>

            {/* Visual: modern trust badge */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-10 text-center shadow-sm">
                <div className="flex items-center gap-1 rounded-full bg-amber-100 px-4 py-1.5 text-amber-700">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">Top Rated in Ongole</p>
                  <p className="mt-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Trusted by Thousands
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-left">
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                     <ShieldCheck className="h-4 w-4 text-blue-600" />
                     100% Genuine Products
                   </div>
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                     <Banknote className="h-4 w-4 text-blue-600" />
                     Best Prices & EMI Offers
                   </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Content ── */}
        <Section>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 text-center">
              Your Trusted Smartphone Showroom in Ongole
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Premium iPhone Dealer in Ongole</h3>
                <p className="text-slate-600 leading-relaxed">
                  Looking for the latest Apple devices? As a trusted <span className="font-medium text-slate-900">iPhone dealer in Ongole</span>, 
                  we stock the complete range of iPhones. Get official brand warranty, original accessories, 
                  and the best exchange value for your old device when upgrading to a new iPhone.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Official Samsung Showroom Ongole</h3>
                <p className="text-slate-600 leading-relaxed">
                  Experience the Galaxy ecosystem at our <span className="font-medium text-slate-900">Samsung showroom Ongole</span>. 
                  From the premium Galaxy S-series and Z-Fold to the budget-friendly M and A series, 
                  find the perfect Samsung smartphone to match your lifestyle and budget.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Authorized Vivo Store Ongole</h3>
                <p className="text-slate-600 leading-relaxed">
                  Capture perfect moments with the latest Vivo camera phones. Visit our <span className="font-medium text-slate-900">Vivo store Ongole</span> to 
                  try out the newest X-series and V-series smartphones. We offer exclusive launch offers 
                  and flexible zero-cost EMI options.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-3">Leading Oppo Dealer Ongole</h3>
                <p className="text-slate-600 leading-relaxed">
                  Discover stunning design and fast charging technology at the top <span className="font-medium text-slate-900">Oppo dealer Ongole</span>. 
                  Get hands-on experience with the Reno series and F-series smartphones with personalized 
                  guidance from our expert staff.
                </p>
              </div>

            </div>

            <div className="mt-10 rounded-2xl bg-blue-50/50 p-8 text-center border border-blue-100">
               <h3 className="text-xl font-bold text-slate-900 mb-4">Plus All Major Brands</h3>
               <p className="text-slate-600 max-w-2xl mx-auto">
                 In addition to being a top dealer for Apple, Samsung, Vivo, and Oppo, our <span className="font-medium text-slate-900">smartphone showroom in Ongole</span> also 
                 offers a wide selection of devices from <span className="font-medium text-slate-900">Realme, OnePlus, Redmi, iQOO, and Motorola</span>. 
                 Whatever your brand preference, we have the genuine product at the best price.
               </p>
            </div>
          </div>
        </Section>

        {/* ── Visit CTA ── */}
        <Section spacing="sm" className="border-t border-slate-200 bg-slate-50/50">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 rounded-[2rem] border border-blue-100 bg-blue-50/50 p-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Visit the Best Mobile Shop in Ongole Today
            </h2>
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <address className="not-italic text-lg leading-relaxed">
                {siteConfig.address.line2}<br />
                {siteConfig.address.line3}<br />
                {siteConfig.address.line4}
              </address>
              <p className="font-medium text-slate-900">{siteConfig.hours}</p>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Button as="a" href={`tel:${siteConfig.phoneTel}`} variant="secondary" className="bg-white hover:bg-slate-50">
                <Phone className="mr-2 h-4 w-4" />
                {siteConfig.phoneDisplay}
              </Button>
              <Button
                as="a"
                href={`https://maps.google.com/?q=${encodeURIComponent(siteConfig.address.line2 + ' ' + siteConfig.address.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
