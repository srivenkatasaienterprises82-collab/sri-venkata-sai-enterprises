"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/layout/section";

import { getStartingPrice, formatPrice, isPriceOnEnquiry } from "@/lib/data/products";
import type { Product } from "@/lib/data/products";

const GRID_SIZE = 6;

export function ProductGrid({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.featured);
  const shown = (featured.length >= GRID_SIZE ? featured : products).slice(0, GRID_SIZE);
  return (
    <Section className="bg-white" container="sm" id="products">
      <div className="w-full">
        <div className="mb-12 flex flex-col items-center justify-center text-center">
          <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-blue-600">
            Our Catalog
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Latest Devices
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((product, i) => {
            const enquiry = isPriceOnEnquiry(product);
            const startingPrice = getStartingPrice(product);
            // Show the cheapest variant's RAM/storage alongside the starting price.
            const variant = startingPrice
              ? product.variants.find((v) => v.price === startingPrice)
              : product.variants[0];
            const originalPrice = variant?.originalPrice;
            const specsStr = variant ? `${variant.ram} • ${variant.storage}` : "";

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/10"
              >
                <Link href={`/products/${product.slug}`} className="relative mb-5 flex h-[260px] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 transition-colors group-hover:bg-slate-100/50">
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
                      className="object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                  <span className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                    {product.brand}
                  </span>
                  <Link href={`/products/${product.slug}`} className="mb-1 text-lg font-bold text-slate-900 transition-colors hover:text-blue-600 line-clamp-1">
                    {product.name}
                  </Link>
                  <p className="mb-5 text-sm font-medium text-slate-500">
                    {specsStr}
                  </p>

                  <div className="mt-auto mb-6 flex items-end justify-between">
                    <div className="flex flex-col">
                      {originalPrice && !enquiry && startingPrice !== undefined && (
                        <span className="text-xs font-medium text-slate-400 line-through mb-0.5">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                      <span className="text-xl font-extrabold text-slate-900">
                        {enquiry || startingPrice === undefined
                          ? "Price on Enquiry"
                          : formatPrice(startingPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/checkout?product=${product.slug}`}
                      className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                    >
                      Buy Now
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
          >
            Explore All Devices
          </Link>
        </div>
      </div>
    </Section>
  );
}
