"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/layout/section";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import type { SwiperClass } from "swiper/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";

import { getStartingPrice, formatPrice, isPriceOnEnquiry } from "@/lib/data/products";
import type { Product } from "@/lib/data/products";

const swiperBreakpoints = {
  0: { slidesPerView: 1.5, spaceBetween: 16 },
  480: { slidesPerView: 2.2, spaceBetween: 16 },
  768: { slidesPerView: 3.2, spaceBetween: 20 },
  1024: { slidesPerView: 4.2, spaceBetween: 20 },
};

export function ProductGrid({ products }: { products: Product[] }) {
  const swiperRef = useRef<SwiperClass | null>(null);
  return (
    <Section className="bg-white" container="sm" id="products">
      <div className="w-full">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-blue-600">
              Our Catalog
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Latest Devices
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 sm:block transition-all"
          >
            View All &rarr;
          </Link>
        </div>

        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 pt-2">
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute -left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-blue-600 hover:shadow-lg active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute -right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-blue-600 hover:shadow-lg active:scale-95"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <Swiper
            modules={[Autoplay, Navigation]}
            onSwiper={(swiper) => { swiperRef.current = swiper; }}
            autoplay={{ delay: 2000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            speed={600}
            breakpoints={swiperBreakpoints}
            grabCursor
            rewind={true}
          >
            {products.map((product) => {
              const enquiry = isPriceOnEnquiry(product);
              const startingPrice = getStartingPrice(product);
              const variant = startingPrice
                ? product.variants.find((v) => v.price === startingPrice)
                : product.variants[0];
              const originalPrice = variant?.originalPrice;
              const specsStr = variant ? `${variant.ram} • ${variant.storage}` : "";

              return (
                <SwiperSlide key={product.id}>
                  <div
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/10 animate-fade-in-up"
                  >
                    <Link href={`/products/${product.slug}`} className="relative mb-4 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 transition-colors group-hover:bg-slate-100/50">
                      <div className={`absolute left-3 top-3 z-10 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm
                        ${product.stock === "inStock" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : 
                          product.stock === "limited" ? "border-amber-200 bg-amber-50 text-amber-700" : 
                          "border-red-200 bg-red-50 text-red-700"}`}>
                        {product.stock === "inStock" ? "In Stock" : product.stock === "limited" ? "Limited" : "Out of Stock"}
                      </div>
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-5 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 200px, 280px"
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
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                        {product.brand}
                      </span>
                      <Link href={`/products/${product.slug}`} className="mb-0.5 text-base font-bold text-slate-900 transition-colors hover:text-blue-600 line-clamp-1">
                        {product.name}
                      </Link>
                      <p className="mb-4 text-xs font-medium text-slate-500">
                        {specsStr}
                      </p>

                      <div className="mt-auto mb-4 flex items-end justify-between">
                        <div className="flex flex-col" suppressHydrationWarning>
                          {originalPrice && !enquiry && startingPrice !== undefined && (
                            <span className="text-[11px] font-medium text-slate-500 line-through mb-0.5">
                              {formatPrice(originalPrice)}
                            </span>
                          )}
                          <span className="text-lg font-extrabold text-slate-900">
                            {enquiry || startingPrice === undefined
                              ? "Price on Enquiry"
                              : formatPrice(startingPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/checkout?product=${product.slug}`}
                          className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                        >
                          Buy Now
                        </Link>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        <div className="mt-6 text-center sm:hidden">
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
