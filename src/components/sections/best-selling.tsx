"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/layout/section";

import { getStartingPrice, formatPrice } from "@/lib/data/products";
import type { Product } from "@/lib/data/products";

export function BestSelling({ products }: { products: Product[] }) {
  const bestSellers = products.slice(0, 8);
  return (
    <Section className="bg-slate-50" container="sm">
      <div className="w-full">

        {/* ── Header ── */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-blue-600">
              Popular Right Now
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Best Selling Phones
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 sm:block transition-all"
          >
            View All &rarr;
          </Link>
        </div>

        {/* ── Scrollable on mobile, grid on desktop ── */}
        <div className="relative -mx-6 px-6 sm:mx-0 sm:px-0">
          <div className="flex gap-4 overflow-x-auto pb-6 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-3 lg:grid-cols-4 sm:gap-6 hide-scrollbar">
            {bestSellers.map((product, i) => {
              const startingPrice = getStartingPrice(product);
              const originalPrice = product.variants[0]?.originalPrice;
              let discount = 0;
              if (startingPrice && originalPrice) {
                discount = Math.round(((originalPrice - startingPrice) / originalPrice) * 100);
              }
              const displayVariant = product.variants[0] ? `${product.variants[0].ram}/${product.variants[0].storage}` : "";
              const colorNames = product.colors.slice(0, 2).map(c => c.name).join(", ");
              const displayInfo = [displayVariant, colorNames].filter(Boolean).join(" · ");

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="group flex w-[240px] flex-shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/10 sm:w-auto"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative mb-4 flex h-[220px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 transition-colors group-hover:bg-slate-100/50"
                  >
                    {discount > 0 && (
                      <div className="absolute left-3 top-3 z-10 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow-sm">
                        {discount}% OFF
                      </div>
                    )}
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 240px, 280px"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <rect x="5" y="2" width="14" height="20" rx="2" />
                          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth={2} strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-col flex-grow">
                    <Link
                      href={`/products/${product.slug}`}
                      className="mb-1.5 line-clamp-2 min-h-[2.75rem] text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600"
                    >
                      {product.name}
                    </Link>
                    <p className="mb-4 text-xs font-medium text-slate-500 line-clamp-1">
                      {displayInfo}
                    </p>

                    <div className="mt-auto flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-slate-900">
                        {startingPrice ? formatPrice(startingPrice) : "Price on Enquiry"}
                      </span>
                      {originalPrice && (
                        <span className="text-xs font-medium text-slate-400 line-through">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile "View All" link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 active:scale-95"
          >
            View All Products &rarr;
          </Link>
        </div>
      </div>
    </Section>
  );
}
