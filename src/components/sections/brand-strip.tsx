"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import type { Brand } from "@/lib/data/brands";

export function BrandStrip({ brands }: { brands: Brand[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.pageX - el.offsetLeft;
    const scrollLeft = el.scrollLeft;
    let isDragging = true;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging) return;
      ev.preventDefault();
      const x = ev.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX);
    };

    const onUp = () => {
      isDragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <Section className="bg-white" container="sm" aria-labelledby="brand-section-heading">
      <div className="w-full">

        {/* ── Header ── */}
        <div className="mb-10">
          <h2
            id="brand-section-heading"
            className="text-[22px] font-extrabold tracking-tight text-slate-900 sm:text-[26px]"
          >
            Shop Phones by Brand
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">
            Select your favorite brand to browse their latest smartphones.
          </p>
        </div>

        {/* ── Horizontal Scrolling Carousel ── */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          className="scrollbar-hide flex flex-nowrap gap-3 overflow-x-auto snap-x snap-mandatory cursor-grab active:cursor-grabbing scroll-smooth"
          role="list"
        >
          {brands.map((brand) => (
            <div key={brand.slug} role="listitem" className="shrink-0 snap-start">
              <Link
                href={`/products?brand=${brand.slug}`}
                aria-label={`Browse ${brand.name} phones`}
                className="group flex min-h-[112px] w-[130px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-400 hover:bg-white hover:shadow-lg hover:shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span className="flex h-10 w-full items-center justify-center px-1">
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={96}
                      height={32}
                      className="max-h-8 max-w-full object-contain"
                    />
                  ) : (
                    // Brands without a logo asset: show a styled initial badge
                    // (avoids the truncated-name colliding with the label below).
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[14px] font-bold uppercase text-slate-500">
                      {brand.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="text-[13px] font-semibold text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                  {brand.name}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
