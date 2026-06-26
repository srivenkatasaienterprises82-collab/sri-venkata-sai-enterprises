"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/data/products";
import type { Product } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";


export function HeroSection({
  products,
  title,
  subtitle,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText,
  secondaryCtaLink,
}: {
  products: Product[];
  title?: string | React.ReactNode;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const featured = products.filter((p) => p.featured).slice(0, 6);
  const carouselProducts = featured.length > 0 ? featured : products.slice(0, 6);
  const safeCarouselProducts = carouselProducts.filter((p) => p.slug);
  const displayTitle = title || (
    <>
      Latest Mobiles{" "}
      <AnimatedGradientText className="whitespace-nowrap">
        at Best Prices
      </AnimatedGradientText>
    </>
  );
  const displaySubtitle = subtitle || "Shop genuine smartphones with EMI options, exchange offers, and personal buying help";
  const hasValidSlug = (product: Product) => product.slug && product.slug.trim().length > 0;
  const handleProductClick = (e: React.MouseEvent, product: Product) => {
    if (isDragging || !hasValidSlug(product)) e.preventDefault();
  };

  const translatePercent = safeCarouselProducts.length > 0 ? (currentIndex / safeCarouselProducts.length) * 100 : 0;

  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(window.innerWidth < 640 ? 1 : 3);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onMotionChange);

    const timer = setTimeout(() => {
      setReducedMotion(mq.matches);
    }, 0);

    return () => {
      window.removeEventListener("resize", handleResize);
      mq.removeEventListener("change", onMotionChange);
      clearTimeout(timer);
    };
  }, []);

  const maxIndex = safeCarouselProducts.length > 0 ? Math.max(0, safeCarouselProducts.length - itemsPerView) : 0;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  useEffect(() => {
    if (isHovered || reducedMotion) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovered, reducedMotion, maxIndex]);

  return (
    <section className="relative overflow-hidden bg-white px-4 pb-16 pt-28 sm:px-8 lg:px-16 xl:px-20">
      {/* Background — CSS only, no canvas particles */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
      <div className="pointer-events-none absolute -top-[10%] left-1/2 z-0 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] right-0 z-0 h-[500px] w-[500px] rounded-full bg-indigo-400/10 blur-[100px]" />

      {/* ── 1. Hero Typography & CTAs ── */}
      <div
        className="relative z-10 mx-auto mb-20 flex w-full max-w-4xl flex-col items-center text-center animate-fade-in"
      >
        <div
          className="animate-fade-in-up delay-100 mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-700 shadow-sm backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          {siteConfig.address.city}&apos;s trusted mobile store
        </div>

        <h1
          className="animate-fade-in-up delay-200 mb-6 text-base xs:text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 whitespace-nowrap max-w-full overflow-hidden text-ellipsis px-4"
        >
          {displayTitle}
        </h1>

        <p
          className="animate-fade-in-up delay-300 mb-10 text-[9px] xxs:text-[10px] xs:text-xs sm:text-sm md:text-lg lg:text-xl leading-relaxed text-slate-500 whitespace-nowrap max-w-full overflow-hidden text-ellipsis px-4"
        >
          {displaySubtitle}
        </p>

        <div className="animate-fade-in-up delay-400 mb-10 flex flex-wrap items-center justify-center gap-4">
          <Link href={primaryCtaLink || "/products"}>
            <ShimmerButton>
              <ShoppingBag className="mr-2 h-5 w-5 inline-block" />
              {primaryCtaText || "Browse Mobiles"}
            </ShimmerButton>
          </Link>
          <Button
            variant="secondary"
            size="lg"
            as={Link}
            href={secondaryCtaLink || "/contact"}
            className="rounded-full"
          >
            {secondaryCtaText || "Get in Touch"}
          </Button>
        </div>
      </div>

      {/* ── 2. Phone Showcase Carousel ── */}
      {safeCarouselProducts.length > 0 && (
        <div
          className="animate-fade-in-up delay-500 relative z-10 mx-auto mb-20 w-full max-w-7xl px-4 sm:px-6 lg:px-8"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Navigation Arrows (Outside overflow-hidden container for more breathing room) */}
          <button
            onClick={handlePrev}
            className="absolute -left-2 sm:-left-6 lg:-left-8 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:shadow-xl"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={handleNext}
            className="absolute -right-2 sm:-right-6 lg:-right-8 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:shadow-xl"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="relative overflow-hidden rounded-3xl bg-slate-50/50 px-4 py-10 sm:px-10 lg:px-14">
            {/* Track */}
            <div
              className="flex items-center transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${translatePercent}%)`,
              }}
              onPointerDown={(e) => {
                setIsDragging(false);
                setStartX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (Math.abs(e.clientX - startX) > 5) {
                  setIsDragging(true);
                }
              }}
              onPointerUp={() => {
                setTimeout(() => setIsDragging(false), 50);
              }}
            >
              {safeCarouselProducts.map((product, i) => {
                const isCenter = itemsPerView === 3 ? i === currentIndex + 1 : i === currentIndex;

                return (
                  <div
                    key={product.id}
                    className="flex w-full flex-shrink-0 items-center justify-center px-3 sm:w-[33.333333%] sm:px-4 py-6"
                    style={{ minHeight: "460px" }}
                  >
                    <Link
                      href={hasValidSlug(product) ? `/products/${product.slug}` : "#"}
                      onClick={(e) => handleProductClick(e, product)}
                      className={`relative flex w-full max-w-[280px] mx-auto flex-col items-center rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 transition-all duration-500 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/10 p-6 ${
                        isCenter
                          ? "z-20 translate-y-0 scale-100 opacity-100 shadow-xl shadow-slate-200/50"
                          : "z-10 translate-y-6 scale-[0.88] opacity-75 hover:opacity-100"
                      }`}
                    >
                      {product.featured && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md z-30">
                          Featured
                        </span>
                      )}

                      <div className="relative flex w-full h-[240px] items-center justify-center overflow-hidden rounded-xl bg-slate-50 mb-5">
                        {product.image && (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            priority={i < 3}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-contain p-4 mix-blend-multiply transition-transform duration-500 hover:scale-105"
                          />
                        )}
                      </div>

                      <div className="text-center w-full flex flex-col items-center mt-2">
                        <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                          {product.brand}
                        </span>
                        <h3 className="text-center font-bold text-slate-900 text-base leading-snug line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="mt-2 font-extrabold text-slate-900 text-base">
                          {formatPrice(product.variants[0]?.price || 0)}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Dots */}
            <div className="mt-10 flex justify-center gap-3">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentIndex === idx ? "w-10 bg-blue-600" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default HeroSection;
