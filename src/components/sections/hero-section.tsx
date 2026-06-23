"use client";

import { motion, Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getAllProducts, formatPrice } from "@/lib/data/products";
import { Button } from "@/components/ui/button";
import { BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";
import { HeroCarousel } from "@/components/ui/hero-carousel";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const carouselProducts = getAllProducts().filter((p) => p.featured).slice(0, 6);

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

  const maxIndex = Math.max(0, carouselProducts.length - itemsPerView);

  useEffect(() => {
    if (isHovered || reducedMotion) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovered, reducedMotion, maxIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  return (
    <section className="relative overflow-hidden bg-white px-4 pb-16 pt-28 sm:px-8 lg:px-16 xl:px-20">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
      <div className="pointer-events-none absolute -top-[10%] left-1/2 z-0 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] right-0 z-0 h-[500px] w-[500px] rounded-full bg-indigo-400/10 blur-[100px]" />

      {/* ── 1. Hero Typography & CTAs ── */}
      <motion.div
        className="relative z-10 mx-auto mb-20 flex w-full max-w-4xl flex-col items-center text-center"
        initial="hidden"
        animate="show"
        variants={containerVariants}
      >
        <motion.div
          variants={fadeUp}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-700 shadow-sm backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          {siteConfig.address.city}&apos;s trusted mobile store
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Latest Mobiles{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            at Best Prices
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl"
        >
          Shop genuine smartphones with EMI options, exchange offers, and personal buying help
        </motion.p>

        <motion.div variants={fadeUp} className="mb-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" as={Link} href="/products" className="rounded-full shadow-lg shadow-blue-600/25">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Browse Mobiles
          </Button>
          <Button variant="secondary" size="lg" as={Link} href="/contact" className="rounded-full">
            Get in Touch
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3"
        >
          {[
            { icon: Star, label: `${siteConfig.rating} rating` },
            { icon: ShieldCheck, label: "Genuine products" },
            { icon: BadgeCheck, label: "Brand warranty" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-sm"
            >
              <item.icon className="h-4 w-4 shrink-0 text-blue-600" />
              <span>{item.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── 2. Phone Showcase Carousel ── */}
      <motion.div
        className="relative z-10 mx-auto mb-20 w-full max-w-7xl"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={fadeUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-3xl bg-slate-50/50 px-4 py-10 sm:px-10 lg:px-14">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:shadow-xl sm:left-4"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:shadow-xl sm:right-4"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Track */}
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(-${(currentIndex / carouselProducts.length) * 100}%)`,
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
            {carouselProducts.map((product, i) => {
              const isCenter = i === currentIndex + 1;

              return (
                <div
                  key={product.id}
                  className="flex w-full flex-shrink-0 items-end justify-center px-3 sm:w-[33.333333%] sm:px-4"
                  style={{ height: "460px" }}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    onClick={(e) => isDragging && e.preventDefault()}
                    className={`relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 transition-all duration-500 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/10 ${
                      isCenter
                        ? "z-20 w-[280px] translate-y-0 scale-100 p-6 opacity-100 shadow-xl shadow-slate-200/50"
                        : "z-10 w-[220px] translate-y-6 scale-[0.92] rounded-xl p-5 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {isCenter && product.featured && (
                      <div className="absolute -top-3 rounded-full bg-amber-500 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                        Featured
                      </div>
                    )}
                    <div
                      className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 ${
                        isCenter ? "mb-5 h-[260px]" : "mb-4 h-[220px]"
                      }`}
                    >
                      {product.image && (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="33vw"
                          className={`object-contain p-4 mix-blend-multiply transition-transform duration-500 hover:scale-105 ${
                            !isCenter ? "object-top" : ""
                          }`}
                        />
                      )}
                    </div>
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">{product.brand}</span>
                    <p className={`text-center font-bold text-slate-900 ${isCenter ? "text-base" : "text-sm"}`}>
                      {product.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`font-extrabold text-slate-900 ${isCenter ? "text-base" : "text-sm"}`}>
                        {formatPrice(product.variants[0]?.price || 0)}
                      </span>
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
      </motion.div>

      {/* ── 3. Image Carousel ── */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-7xl"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <HeroCarousel
          images={[
            "/images/slides/slide1.jpg",
            "/images/slides/slide2.webp",
            "/images/slides/slide3.webp",
            "/images/slides/slide4.webp",
            "/images/slides/slide5.jpeg",
          ]}
          className="h-[260px] rounded-2xl shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/5 sm:h-[360px] md:h-[460px] lg:h-[560px]"
        />
      </motion.div>
    </section>
  );
}
