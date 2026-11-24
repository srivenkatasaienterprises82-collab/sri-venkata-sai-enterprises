"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RefreshCw, CreditCard } from "lucide-react";
import type { SanityOffer } from "@/sanity/types";
import { resolveImage } from "@/sanity/lib/image";

export function BentoDeals({ offers }: { offers?: SanityOffer[] }) {
  // Offers are managed in Sanity Studio (Offers collection). With none
  // published there is nothing to show — no hardcoded product deals.
  if (!offers?.length) return null;

  // ── Falls back to generic store messaging per empty slot ──
  const getOffer = (
    index: number,
    fallback: {
      badge?: string;
      title: string;
      subtitle?: string;
      discountText?: string;
      image?: string;
      link: string;
      cta?: string;
    }
  ) => {
    if (offers && offers[index]) {
      const o = offers[index];
      return {
        title: o.title,
        badge: o.badge,
        subtitle: o.subtitle,
        discountText: o.discountText,
        image: resolveImage(o.image),
        link: o.link || "/",
        cta: o.cta || "Shop Now",
      };
    }
    return fallback;
  };

  const c1 = getOffer(0, {
    badge: "New Arrivals",
    title: "Latest 5G Phones",
    subtitle: "New launches land in store every week — ask us what just arrived.",
    link: "/products",
    cta: "Browse Catalog",
  });

  const c2 = getOffer(1, {
    badge: "EMI Offer",
    title: "0% EMI",
    subtitle: "Up to 12 months on all smartphones above ₹20k. No hidden charges.",
    link: "/products",
    cta: "Available Now",
  });

  const c3 = getOffer(2, {
    title: "Exchange Bonus",
    discountText: "Up to ₹15,000",
    subtitle: "Bring your old phone to the store for an instant valuation.",
    link: "/contact",
  });

  const c4 = getOffer(3, {
    badge: "Ask the Store",
    title: "Best Price on Any 5G Phone",
    subtitle: "Tell us the model you want — we'll quote today's best price.",
    link: "/contact",
    cta: "Contact Us",
  });

  return (
    <section className="bg-slate-50 px-8 pb-12 pt-6">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {/* 1. Featured offer (Spans 2 columns) */}
        <Link href={c1.link} className="md:col-span-2">
          <div className="group relative flex h-[280px] flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="z-10 flex flex-col items-start">
              {c1.badge && (
                <span className="mb-3 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">
                  {c1.badge}
                </span>
              )}
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{c1.title}</h3>
              {c1.subtitle && (
                <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-500 font-medium">
                  {c1.subtitle}
                </p>
              )}
              <div className="mt-auto pt-14">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{c1.discountText}</span>
              </div>
            </div>
            {c1.image && (
              <div className="absolute -bottom-[20%] -right-[5%] h-[320px] w-[280px]">
                <Image
                  src={c1.image}
                  alt={c1.title}
                  fill
                  className="object-contain mix-blend-multiply opacity-90 transition-transform hover:scale-105 duration-500"
                />
              </div>
            )}
          </div>
        </Link>

        {/* 2. EMI CARD */}
        <div className="group flex h-[280px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
            {c2.badge && (
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {c2.badge}
              </span>
            )}
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">{c2.title}</h3>
            {c2.subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
                {c2.subtitle}
              </p>
            )}
          </div>
          <a
            href={c2.link}
            className="flex items-center gap-1.5 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
          >
            {c2.cta} <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* 3. EXCHANGE CARD */}
        <div className="group flex h-[240px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">{c3.title}</h3>
            {c3.discountText && (
              <p className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">{c3.discountText}</p>
            )}
            {c3.subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
                {c3.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 4. VIVO CARD — Vivo T5x 5G (Spans 2 columns) */}
        <Link href={c4.link} className="md:col-span-2">
          <div className="group relative flex h-[240px] flex-col justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="z-10 flex flex-col items-start">
              {c4.badge && (
                <span className="mb-3 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600">
                  {c4.badge}
                </span>
              )}
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{c4.title}</h3>
              {c4.subtitle && (
                <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-500 font-medium">
                  {c4.subtitle}
                </p>
              )}
              <span className="mt-5 text-3xl font-extrabold text-slate-900 tracking-tight">{c4.discountText}</span>
            </div>
            {c4.image && (
              <div className="absolute -bottom-[30%] -right-[10%] h-[340px] w-[340px]">
                <Image
                  src={c4.image}
                  alt={c4.title}
                  fill
                  className="object-contain mix-blend-multiply opacity-90 transition-transform hover:scale-105 duration-500"
                />
              </div>
            )}
          </div>
        </Link>
      </div>
    </section>
  );
}
export default BentoDeals;
