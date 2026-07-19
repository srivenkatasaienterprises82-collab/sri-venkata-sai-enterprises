"use client";

import { useRef } from "react";
import { getProductBySlug, formatPrice, isPriceOnEnquiry } from "@/lib/data/products";
import type { Product } from "@/lib/data/products";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import type { SwiperClass } from "swiper/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import "swiper/css";

const TARGET_SLUGS = [
  "samsung-s25-ultra",
  "iqoo-15",
  "realme-16-pro-plus",
  "poco-m7-plus",
  "samsung-s26-plus",
  "vivo-t4-ultra",
  "oppo-reno-15-pro-mini"
];

const swiperBreakpoints = {
  0: { slidesPerView: 1.2, spaceBetween: 16 },
  480: { slidesPerView: 2.2, spaceBetween: 16 },
  768: { slidesPerView: 3.2, spaceBetween: 20 },
  1024: { slidesPerView: 4.2, spaceBetween: 20 },
};

export function TopRatedPerformance({ products }: { products?: Product[] }) {
  const swiperRef = useRef<SwiperClass | null>(null);
  const topRatedPhones = products?.length
    ? products
    : TARGET_SLUGS.map(slug => getProductBySlug(slug)).filter(Boolean) as Product[];

  return (
    <section className="bg-slate-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-blue-600 uppercase mb-2">
              Power &amp; Speed
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Top-Rated for Performance
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-bold text-slate-500 hover:text-blue-600 sm:block transition-colors"
          >
            View All &rarr;
          </Link>
        </div>

        {/* Auto-sliding carousel */}
        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 pb-4 pt-2">
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-blue-600 hover:shadow-lg active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-all hover:bg-slate-50 hover:text-blue-600 hover:shadow-lg active:scale-95"
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
            {topRatedPhones.map((phone) => {
              const variant = phone.variants[0];
              const startingPrice =
                variant?.flipkartPrice ?? phone.flipkartPrice ?? variant?.price;
              const originalPrice = variant?.originalPrice;
              let discount = 0;
              if (startingPrice && originalPrice) {
                discount = Math.round(((originalPrice - startingPrice) / originalPrice) * 100);
              }
              const specsStr = variant ? `${variant.ram}/${variant.storage}` : "";
              const colorStr = phone.colors[0]?.name || "Various colors";

              return (
                <SwiperSlide key={phone.id}>
                  <div className="group relative flex flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
                    {discount > 0 && (
                      <div className="absolute left-3 top-3 z-10 rounded-lg bg-red-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                        {discount}% OFF
                      </div>
                    )}

                    <Link href={`/products/${phone.slug}`} className="relative h-40 w-full bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden transition-colors group-hover:bg-slate-100/50">
                      {phone.image ? (
                        <Image
                          src={phone.image}
                          alt={phone.name}
                          fill
                          className="object-contain p-5 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 200px, 240px"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-300">
                          <svg
                            className="h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.2}
                          >
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                            <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth={2} strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-col gap-1.5 p-5 pt-4">
                      <Link href={`/products/${phone.slug}`} className="text-base font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {phone.name}
                      </Link>
                      <p className="text-xs font-medium text-slate-500 leading-snug line-clamp-1">
                        {specsStr} · {colorStr}
                      </p>
                      <div className="mt-3 flex items-baseline gap-2 border-t border-slate-100 pt-3">
                        <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                          {isPriceOnEnquiry(phone) ? "Price on Enquiry" : formatPrice(startingPrice || 0)}
                        </span>
                        {originalPrice && !isPriceOnEnquiry(phone) && (
                          <span className="text-[11px] font-semibold text-slate-400 line-through">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>

        {/* Mobile View All Link */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/products"
            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
export default TopRatedPerformance;
