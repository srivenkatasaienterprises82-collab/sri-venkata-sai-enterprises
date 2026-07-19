"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Tag, Truck, ShieldCheck, MessageCircle, ShoppingCart, ChevronLeft, ChevronRight, CheckCircle, ExternalLink } from "lucide-react";

import { Product, formatPrice, isPriceOnEnquiry } from "@/lib/data/products";
import { siteConfig } from "@/lib/data/siteConfig";
import { Button } from "@/components/ui/button";

export function ProductDetail({ product, galleryImages }: { product: Product; galleryImages?: string[] }) {
  const [activeVariant] = useState(product.variants[0] ?? null);
  const [activeColor, setActiveColor] = useState(product.colors[0] ?? null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeRam, setActiveRam] = useState(product.ramOptions?.[0] ?? product.variants[0]?.ram ?? "");
  const [activeStorage, setActiveStorage] = useState(product.storageOptions?.[0] ?? product.variants[0]?.storage ?? "");

  // Sanity products (e.g. iPhones) often arrive with empty `ramOptions` /
  // `storageOptions` arrays even though their `variants` DO carry ram/storage.
  // Derive the option lists from the variants so the selector actually renders
  // — otherwise the price can never change on variant click. Mirrors the
  // derivation in src/lib/data/products.ts (used for the static fallback).
  const ramOptions = product.ramOptions?.length
    ? product.ramOptions
    : Array.from(new Set(product.variants.map((v) => v.ram).filter((r): r is string => !!r)));
  const storageOptions = product.storageOptions?.length
    ? product.storageOptions
    : Array.from(new Set(product.variants.map((v) => v.storage).filter((s): s is string => !!s)));
  
  const enquiryOnly = isPriceOnEnquiry(product);
  // Keep hasProductPrice for the JSON-LD structured data (schemaOffers).
  // Some products have a single price (accessories/earbuds), others have per-variant pricing.
  const hasProductPrice = typeof product.price === "number" && Number.isFinite(product.price);
  // Always prefer the selected variant's price over the product-level price.
  // This ensures the price updates when the user clicks a different variant button.
  // A variant whose `ram` is null (common for iPhones) should match an empty
  // activeRam selection. Normalise null -> "" on both sides.
  const matchingVariant = product.variants.find(
    (variant) => (variant.ram ?? "") === activeRam && (variant.storage ?? "") === activeStorage,
  );
  const displayPrice = matchingVariant?.price ?? activeVariant?.price ?? product.price;
  const displayOriginalPrice = matchingVariant?.originalPrice ?? activeVariant?.originalPrice ?? product.originalPrice;
  // Per-variant marketplace prices: each RAM/Storage combo can carry its
  // own Flipkart and/or Amazon price (written by the 6h price-sync). Show
  // them so the user sees the split + the lowest deal, and so the "Buy Now"
  // link opens the correct configuration.
  const variantFlipkartPrice = matchingVariant?.flipkartPrice;
  const variantAmazonPrice = matchingVariant?.amazonPrice;
  const amazonUrl = matchingVariant?.amazonUrl ?? product.amazonUrl;
  const flipkartUrl = matchingVariant?.flipkartUrl ?? product.flipkartUrl;

  const images = galleryImages ?? [product.image];

  const schemaOffers = hasProductPrice
    ? [{
        "@type": "Offer",
        sku: product.slug,
        name: product.name,
        price: product.price!,
        priceCurrency: "INR",
        availability: product.stock === "inStock"
          ? "https://schema.org/InStock"
          : product.stock === "limited"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: siteConfig.storeName },
      }]
    : product.variants
        .filter((v) => v.price)
        .map((v) => ({
          "@type": "Offer",
          sku: `${product.slug}-${v.ram}-${v.storage}`,
          name: `${product.name} ${v.ram} ${v.storage}`,
          price: v.price!,
          priceCurrency: "INR",
          availability: product.stock === "inStock"
            ? "https://schema.org/InStock"
            : product.stock === "limited"
              ? "https://schema.org/LimitedAvailability"
              : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: siteConfig.storeName },
        }));

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: index * width, behavior: "smooth" });
    setActiveImageIndex(index);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    // adding a small offset so it doesn't jump prematurely
    const index = Math.round((scrollLeft + 10) / width);
    if (index !== activeImageIndex && index >= 0 && index < images.length) {
      setActiveImageIndex(index);
    }
  };

  // Build JSON-LD Product schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    sku: product.slug,
    image: galleryImages ?? [product.image],
    offers: schemaOffers,
    aggregateRating: {
      "@type": "AggregateRating",
      // Store-wide rating sourced from Justdial (see siteConfig.ratingSourceUrl).
      ratingValue: siteConfig.ratingValue,
      reviewCount: siteConfig.reviewCount,
      sameAs: siteConfig.ratingSourceUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <div className="min-h-screen bg-slate-50 pb-[100px] pt-[120px] text-slate-900">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Link href="/products" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        {/* 2-Column Layout on Desktop, Single Column on Mobile */}
        <div className="flex flex-col gap-[48px] md:flex-row items-start">
          
          {/* ── Left Column: Image Carousel ── */}
          <div className="flex w-full flex-col gap-4 md:w-1/2 md:sticky md:top-24">
            {/* Main Image Viewport */}
            <div className="group relative flex h-[400px] w-full items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-white sm:h-[500px] shadow-sm">
              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="scrollbar-hide flex h-full w-full snap-x snap-mandatory scroll-smooth overflow-x-auto"
              >
                {images.map((img, idx) => (
                  <div key={idx} className="relative h-full w-full shrink-0 snap-center p-8 bg-white flex justify-center items-center">
                    {img ? (
                      <Image
                        src={img}
                        alt={`${product.name} view ${idx + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain p-12 mix-blend-multiply"
                        priority={idx === 0}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <rect x="5" y="2" width="14" height="20" rx="2" />
                          <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth={2} strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={() => scrollToIndex(Math.max(0, activeImageIndex - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 p-2.5 text-slate-700 opacity-0 shadow-md backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:scale-105 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                disabled={activeImageIndex === 0}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button 
                onClick={() => scrollToIndex(Math.min(images.length - 1, activeImageIndex + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 p-2.5 text-slate-700 opacity-0 shadow-md backdrop-blur-md transition-all hover:bg-white hover:text-blue-600 hover:scale-105 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                disabled={activeImageIndex === images.length - 1}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Thumbnail Row */}
            <div className="scrollbar-hide flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToIndex(idx)}
                  className={`relative h-[80px] w-[80px] shrink-0 snap-center overflow-hidden rounded-[16px] border-2 bg-white transition-all ${
                    activeImageIndex === idx ? "border-blue-600 ring-2 ring-blue-600/20 shadow-sm" : "border-slate-200 hover:border-slate-300"
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  {img ? (
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      sizes="80px"
                      className="object-contain p-2 mix-blend-multiply"
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right Column: Info Panel ── */}
          <div className="flex w-full flex-col md:w-1/2 pb-32 md:pb-12">
            <div className="">
              <div className="mb-3 text-[13px] font-semibold text-slate-500 tracking-wide uppercase">
                {product.brand}
              </div>

              <h1 className="mb-4 text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl tracking-tight">
                {product.name}
              </h1>

              {/* Reviews / Rating — store-wide rating sourced from Justdial */}
              <div className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600">
                <div className="flex items-center text-amber-500" aria-hidden="true">
                  ★★★★★
                </div>
                <a
                  href={siteConfig.ratingSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-blue-600 hover:underline"
                  title="View reviews on Justdial"
                >
                  {siteConfig.rating} ({siteConfig.reviewCount} reviews)
                </a>
              </div>
              
              <div className="mb-8 flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm ${
                  product.stock === "inStock"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : product.stock === "limited"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  {product.stock === "inStock"
                    ? "In Stock"
                    : product.stock === "limited"
                      ? "Limited"
                      : "Out of Stock"}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                  <Truck className="h-4 w-4 text-blue-600" /> Free Local Delivery
                </span>
              </div>

              <div className="mb-10 flex items-end gap-3">
                {enquiryOnly ? (
                  <span className="text-3xl font-extrabold text-slate-900">Price on Enquiry</span>
                ) : displayPrice ? (
                  <>
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{formatPrice(displayPrice)}</span>
                    {displayOriginalPrice && (
                      <span className="mb-1.5 text-lg font-medium text-slate-400 line-through">
                        {formatPrice(displayOriginalPrice)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-slate-900">Price on Enquiry</span>
                )}
              </div>

              {/* Per-variant marketplace price breakdown (Flipkart vs Amazon) */}
              {!enquiryOnly && (variantFlipkartPrice || variantAmazonPrice) ? (
                <div className="mb-8 grid grid-cols-2 gap-3">
                  {variantFlipkartPrice ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Flipkart</p>
                      <p className="text-lg font-bold text-slate-900">{formatPrice(variantFlipkartPrice)}</p>
                    </div>
                  ) : null}
                  {variantAmazonPrice ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amazon</p>
                      <p className="text-lg font-bold text-slate-900">{formatPrice(variantAmazonPrice)}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Color Selector */}
              <div className="mb-10">
                <p className="mb-4 text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Color: <span className="text-slate-600 ml-1">{activeColor?.name ?? "N/A"}</span>
                </p>
                <div className="flex gap-4">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setActiveColor(color)}
                      aria-label={`${color.name} color variant`}
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                        activeColor?.name === color.name
                          ? "ring-2 ring-blue-600 ring-offset-2 ring-offset-slate-50 scale-110"
                          : "ring-1 ring-slate-200 hover:ring-slate-400"
                      }`}
                    >
                      <span
                        className="h-10 w-10 rounded-full border border-slate-200 shadow-sm"
                        style={{ backgroundColor: color.hex || "#333333" }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {(ramOptions.length || storageOptions.length || product.variants.length) ? (
                <div className="mb-10 space-y-6">
                  {ramOptions.length ? (
                    <div>
                      <p className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">RAM</p>
                      <div className="flex flex-wrap gap-3">
                        {ramOptions.map((ram) => (
                          <button
                            key={ram}
                            onClick={() => setActiveRam(ram)}
                            className={`rounded-2xl border-2 px-5 py-3 text-sm font-bold transition-all ${activeRam === ram ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          >
                            {ram}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {storageOptions.length ? (
                    <div>
                      <p className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">Storage</p>
                      <div className="flex flex-wrap gap-3">
                        {storageOptions.map((storage) => (
                          <button
                            key={storage}
                            onClick={() => setActiveStorage(storage)}
                            className={`rounded-2xl border-2 px-5 py-3 text-sm font-bold transition-all ${activeStorage === storage ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                          >
                            {storage}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Bank Offers */}
              <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Available Offers
                </h3>
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Selected Bank Offers</p>
                      <p className="text-sm text-slate-600 mt-1">On selected banks get ₹2,000 instant discount.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">SVS Exchange Bonus</p>
                      <p className="text-sm text-slate-600 mt-1">Up to ₹6,000 extra value on exchanging your old smartphone.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spec Table */}
              <div className="mb-10">
                <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Key Specifications
                </h3>
                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="flex border-b border-slate-100 py-4 px-6 last:border-0 hover:bg-slate-50 transition-colors">
                      <span className="w-1/3 text-sm font-semibold text-slate-500">{spec.label}</span>
                      <span className="w-2/3 text-sm font-medium text-slate-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Sticky Mobile Footer / Static Desktop Actions ── */}
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 p-4 pb-6 backdrop-blur-xl md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none shadow-[0_-10px_20px_rgba(0,0,0,0.05)] md:shadow-none">
                <div className="flex gap-4">
                  {enquiryOnly ? (
                    <Button
                      as="a"
                      variant="whatsapp"
                      size="xl"
                      href={`${siteConfig.whatsappUrl}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}. Please share the price.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex-1"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Enquire on WhatsApp
                    </Button>
                  ) : (
                    <>
                      <Button
                        as="a"
                        variant="whatsapp"
                        size="xl"
                        href={`${siteConfig.whatsappUrl}?text=${encodeURIComponent(
                          `Hi ${siteConfig.storeName}, I would like to enquire about the ${product.name}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-[0.5] rounded-2xl px-2 sm:px-4"
                        title="Enquire on WhatsApp"
                        suppressHydrationWarning
                      >
                        <MessageCircle className="h-5 w-5 sm:mr-2" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="xl"
                        as={Link}
                        href={`/checkout?product=${product.slug}&ram=${encodeURIComponent(activeRam)}&storage=${encodeURIComponent(activeStorage)}&color=${encodeURIComponent(activeColor?.name ?? "")}`}
                        className="flex-1 rounded-2xl"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Buy Now
                      </Button>
                    </>
                  )}

                  {amazonUrl ? (
                    <Button
                      as="a"
                      variant="primary"
                      size="xl"
                      href={amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-2xl"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Buy on Amazon
                    </Button>
                  ) : null}

                  {flipkartUrl ? (
                    <Button
                      as="a"
                      variant="primary"
                      size="xl"
                      href={flipkartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-2xl"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Buy on Flipkart
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
}
