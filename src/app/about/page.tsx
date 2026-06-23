import { Section } from "@/components/layout/section";
import { Footer } from "@/components/sections/footer";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import { getAllBrands } from "@/lib/data/brands";
import { siteConfig } from "@/lib/data/siteConfig";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  BadgeCheck,
  Banknote,
  RefreshCw,
  Users,
  PackageCheck,
  MapPin,
  Phone,
  MessageCircle,
  Star,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `About Us | ${siteConfig.storeName} — ${siteConfig.address.city} Mobile Store`,
  description:
    `${siteConfig.address.city}'s trusted mobile store with ${siteConfig.happyCustomers} happy customers. Genuine smartphones, official warranty, EMI options, fair exchange values & personal service. ${siteConfig.address.line2}, ${siteConfig.address.line4}.`,
  alternates: { canonical: "/about" },
};

const stats = [
  { icon: Users, value: siteConfig.happyCustomers, label: "Happy Customers" },
  { icon: PackageCheck, value: siteConfig.phonesInStock, label: "Phones in Stock" },
  { icon: BadgeCheck, value: "100%", label: "Genuine Products" },
  { icon: RefreshCw, value: "1 Year", label: "Brand Warranty" },
];

const values = [
  {
    icon: ShieldCheck,
    title: "100% Genuine, Always",
    body: "Every device is sourced from authorized distributors and ships with official brand warranty, original box, accessories, and a valid GST invoice.",
  },
  {
    icon: Banknote,
    title: "EMI & Fair Exchange",
    body: "Flexible 0% EMI through leading banks and NBFCs, plus exchange values that often beat online quotes for your old phone.",
  },
  {
    icon: Users,
    title: "Personal Buying Help",
    body: "No pushy sales. Our team helps you compare models honestly and choose the right phone for your budget and needs.",
  },
  {
    icon: MapPin,
    title: "Local & Trusted",
    body: `Based on Kurnool Road, ${siteConfig.address.city}. Walk in to see and compare phones in person, or order online and pick up at the store.`,
  },
];

export default function AboutPage() {
  const brands = getAllBrands();

  return (
    <>
      <main className="pt-20 bg-white">
        {/* ── Hero ── */}
        <Section className="border-b border-slate-200">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col items-start text-left">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                About <GradientText>Sri Venkata Sai</GradientText>
              </h1>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-lg">
                {siteConfig.address.city}&apos;s trusted destination for genuine smartphones. We&apos;ve served
                <span className="font-semibold text-slate-900"> {siteConfig.happyCustomers} happy customers </span> 
                with honest advice, fair prices, and reliable after-sales service.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button as={Link} href="/products" variant="primary">
                  Browse Mobiles
                </Button>
                <Button
                  as="a"
                  href={siteConfig.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Us
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
                  <p className="text-4xl font-bold text-slate-900">{siteConfig.happyCustomers}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Happy Customers in {siteConfig.address.city}
                  </p>
                </div>
                <div className="mt-2 flex -space-x-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-slate-400"
                    >
                      <Users className="h-5 w-5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Stats ── */}
        <Section spacing="sm" className="border-b border-slate-200 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <span className="block text-2xl font-bold text-slate-900">{s.value}</span>
                  <span className="mt-1 block text-sm text-slate-500">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Story ── */}
        <Section>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Our Story
            </h2>
            <div className="mt-8 flex flex-col gap-6 text-lg text-slate-600 leading-relaxed text-left">
              <p>
                Located on Kurnool Road in the heart of {siteConfig.address.city}, {siteConfig.storeName}
                stocks <span className="font-semibold text-slate-900">{siteConfig.phonesInStock} smartphones</span>{" "}
                from top brands including Apple, Samsung, Vivo, iQOO, Oppo, Motorola, OnePlus, and
                Realme. Every device we sell is 100% genuine, sourced from authorized distributors,
                and comes with official brand warranty and a GST invoice.
              </p>
              <p>
                We believe buying a smartphone should be simple, transparent, and enjoyable. That&apos;s
                why we offer flexible EMI options, fair exchange values, competitive pricing, and
                personal guidance to help you choose the perfect device.
              </p>
              <p>
                Whether you visit our store, call us, or WhatsApp us, you&apos;ll always get honest
                advice, genuine products, and the best possible price. Our customers come back
                because they trust us — and we work hard to earn that trust every single day.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Values ── */}
        <Section spacing="sm" className="border-t border-slate-200 bg-slate-50/50">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <v.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Brands ── */}
        <Section spacing="sm" className="border-t border-slate-200">
          <div className="flex flex-col items-center gap-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
              Brands We Carry
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {brands
                .filter((b) => b.featured && b.logo)
                .map((brand) => (
                  <Link
                    key={brand.slug}
                    href={`/products?brand=${brand.slug}`}
                    className="flex h-16 min-w-[140px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                  >
                    <Image
                      src={brand.logo!}
                      alt={`${brand.name} phones in Ongole`}
                      width={96}
                      height={32}
                      className="h-8 w-auto object-contain opacity-80 transition-opacity hover:opacity-100"
                    />
                  </Link>
                ))}
            </div>
          </div>
        </Section>

        {/* ── Visit CTA ── */}
        <Section spacing="sm" className="border-t border-slate-200 bg-slate-50/50">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 rounded-[2rem] border border-blue-100 bg-blue-50/50 p-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Visit our store in Ongole
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
                href={siteConfig.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="whatsapp"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp Us
              </Button>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
