"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, getStartingPrice } from "@/lib/data/products";
import type { Product } from "@/lib/data/products";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@/components/ui/button";

import { ShimmerButton } from "@/components/ui/shimmer-button";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";

/** Popular brands to show on home page */
const POPULAR_BRAND_SLUGS = [
  "vivo", "iqoo", "motorola", "redmi", "samsung", "apple",
  "oneplus", "oppo", "realme", "google", "nothing", "poco", "narzo"
];

export function HeroSection({
  products,
  title,
  subtitle,
  primaryCtaText,
  primaryCtaLink,
  secondaryCtaText,
  secondaryCtaLink,
  heroSlides,
}: {
  products: Product[];
  title?: string | React.ReactNode;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  heroSlides?: string[];
}) {
  const [mounted, setMounted] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!heroSlides || heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides]);

  const featured = products.filter((p) => p.featured && POPULAR_BRAND_SLUGS.includes(p.brandSlug.toLowerCase())).slice(0, 16);
  const carouselProducts = featured.length > 0 ? featured : products.filter((p) => POPULAR_BRAND_SLUGS.includes(p.brandSlug.toLowerCase())).slice(0, 16);
  const safeCarouselProducts = carouselProducts.filter((p) => p.slug);
const displayTitle =
  title ?? "Sri Venkata Sai enterprises — Ongole's Best Mobile Deals";
  const displaySubtitle = subtitle || "Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo, Motorola, OnePlus & more.";
  const hasValidSlug = (product: Product) => product.slug && product.slug.trim().length > 0;

  return (
    <section className="relative overflow-hidden bg-white px-4 pt-20 pb-12 md:px-8 md:pt-28 md:pb-16 lg:px-16 xl:px-20">
      {/* Background — Dynamic Slideshow (if heroSlides provided) */}
      {heroSlides && heroSlides.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 z-0"
            style={{ backgroundImage: `url(${heroSlides[currentSlideIndex]})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
          />
        </AnimatePresence>
      )}

      {/* Background — Gradient overlay (always on top of slideshow) */}
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

<motion.h1
initial={{ opacity: 0, scale: 0.95, y: 20 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.4 }}
className="mb-6 text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900 max-w-full px-4"
>
{displayTitle}
</motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.4 }}
          className="mb-10 flex w-full justify-center px-4"
        >
          <div className="inline-flex max-w-full items-center gap-2 sm:gap-3 rounded-full border border-slate-200/80 bg-white/70 p-1.5 pr-4 sm:pr-6 shadow-sm backdrop-blur-md">
<span className="shrink-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">
  Sri Sai Venkat Enterprises
</span>
<span className="truncate text-[11px] sm:text-sm font-medium text-slate-700">
<span className="font-bold text-slate-900">Best Mobile Deals</span>
<span className="text-slate-300 mx-1.5 sm:mx-2">|</span>
              {displaySubtitle}
            </span>
          </div>
        </motion.div>

        <div className="animate-fade-in-up delay-400 mb-10 flex w-full flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0">
          <Link href={primaryCtaLink || "/products"} className="w-full sm:w-auto">
            <ShimmerButton className="w-full sm:w-auto justify-center">
              <ShoppingBag className="mr-2 h-5 w-5 inline-block" />
              {primaryCtaText || "Browse Mobiles"}
            </ShimmerButton>
          </Link>
          <Button
            variant="secondary"
            size="lg"
            as={Link}
            href={secondaryCtaLink || "/contact"}
            className="w-full sm:w-auto rounded-full"
          >
            {secondaryCtaText || "Get in Touch"}
          </Button>
        </div>
      </div>

      {/* ── 2. Phone Showcase Carousel ── */}
      {safeCarouselProducts.length > 0 && (
        <div className="animate-fade-in-up delay-500 relative z-10 mx-auto mb-20 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {!mounted ? (
            <div className="relative overflow-hidden rounded-3xl bg-slate-50/50 px-0 py-10 sm:px-4 lg:px-8 min-h-[500px] flex items-center justify-center">
              <div className="animate-pulse flex gap-8 w-full justify-center overflow-hidden">
                 {[1, 2, 3].map(i => (
                   <div key={i} className={`h-[460px] w-[280px] shrink-0 rounded-2xl bg-slate-200/50 ${i !== 2 ? 'hidden lg:block opacity-50 scale-90' : 'scale-105'}`} />
                 ))}
              </div>
            </div>
          ) : (
            <>
              <style>{`
                .hero-swiper {
                  padding-bottom: 3rem !important;
                }
                .hero-swiper .swiper-slide > div {
                  transform: scale(0.92);
                  opacity: 0.7;
                  transform-origin: center center;
                  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease-out;
                  will-change: transform;
                  backface-visibility: hidden;
                }
                .hero-swiper .swiper-slide-active > div {
                  transform: scale(1.08);
                  opacity: 1;
                  z-index: 20;
                  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                }
                .hero-swiper .swiper-pagination-bullet {
                  width: 10px;
                  height: 10px;
                  background-color: #cbd5e1;
                  opacity: 1;
                  transition: all 300ms ease;
                }
                .hero-swiper .swiper-pagination-bullet-active {
                  width: 40px;
                  border-radius: 5px;
                  background-color: #2563eb;
                }
                .hero-swiper-prev, .hero-swiper-next {
                  position: absolute;
                  top: 50%;
                  transform: translateY(-50%);
                  z-index: 30;
                  display: flex;
                  height: 48px;
                  width: 48px;
                  align-items: center;
                  justify-content: center;
                  border-radius: 9999px;
                  border: 1px solid rgba(226, 232, 240, 0.8);
                  background-color: rgba(255, 255, 255, 0.95);
                  color: #475569;
                  box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.05);
                  backdrop-filter: blur(12px);
                  transition: all 200ms ease;
                  cursor: pointer;
                }
                .hero-swiper-prev:hover, .hero-swiper-next:hover {
                  background-color: white;
                  color: #2563eb;
                  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1);
                }
                .hero-swiper-prev { left: -8px; }
                .hero-swiper-next { right: -8px; }
                @media (min-width: 640px) {
                  .hero-swiper-prev { left: -24px; }
                  .hero-swiper-next { right: -24px; }
                }
                @media (min-width: 1024px) {
                  .hero-swiper-prev { left: -32px; }
                  .hero-swiper-next { right: -32px; }
                }
              `}</style>

              <button className="hero-swiper-prev" aria-label="Previous slide">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button className="hero-swiper-next" aria-label="Next slide">
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="relative overflow-hidden rounded-3xl bg-slate-50/50 px-0 py-10 sm:px-4 lg:px-8">
                <Swiper
                  modules={[Navigation, Pagination, Autoplay]}
                  loop={true}
                  centeredSlides={true}
                  speed={200}
                  autoplay={{
                    delay: 2000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  touchRatio={2}
                  touchStartPreventDefault={false}
                  navigation={{
                    prevEl: '.hero-swiper-prev',
                    nextEl: '.hero-swiper-next',
                  }}
                  pagination={{
                    clickable: true,
                  }}
                  breakpoints={{
                    320: { slidesPerView: 1.2, spaceBetween: 16 },
                    640: { slidesPerView: 2, spaceBetween: 24 },
                    1024: { slidesPerView: 3, spaceBetween: 32 },
                  }}
                  className="hero-swiper"
                >
                  {safeCarouselProducts.map((product, i) => (
                    <SwiperSlide key={`${product.id}-${i}`} className="py-6">
                      <div className="relative flex w-full max-w-[280px] mx-auto flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 transition-colors duration-300 hover:border-blue-200" style={{ minHeight: "460px" }}>
                        <Link
                          href={hasValidSlug(product) ? `/products/${product.slug}` : "#"}
                          className="flex w-full flex-col items-center"
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
                              {formatPrice(getStartingPrice(product) || 0)}
                            </p>
                          </div>
                        </Link>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </>
          )}

          <div className="mt-12 flex justify-center px-4 w-full">
            <Button
              as={Link}
              href="/products"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 sm:px-10 sm:text-base w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center">
                Explore All Mobiles
                <ChevronRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
export default HeroSection;
