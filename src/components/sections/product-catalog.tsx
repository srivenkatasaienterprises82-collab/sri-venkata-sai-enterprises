"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Eye, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatPrice,
  getFlipkartPrice,
  getStartingPrice,
  isPriceOnEnquiry,
  type Product,
} from "@/lib/data/products";
import { cn } from "@/lib/utils";

const PRICE_BUCKETS: Array<{ id: string; label: string; min: number; max: number }> = [
  { id: "under-10k", label: "Under ₹10,000", min: 0, max: 10000 },
  { id: "10k-20k", label: "₹10,000 – ₹20,000", min: 10000, max: 20000 },
  { id: "20k-30k", label: "₹20,000 – ₹30,000", min: 20000, max: 30000 },
  { id: "30k-50k", label: "₹30,000 – ₹50,000", min: 30000, max: 50000 },
  { id: "above-50k", label: "Above ₹50,000", min: 50000, max: Number.POSITIVE_INFINITY },
];

const STOCK_FILTERS: Array<{ id: "any" | "in-stock" | "featured"; label: string }> = [
  { id: "any", label: "All" },
  { id: "in-stock", label: "In stock" },
  { id: "featured", label: "Featured" },
];

interface ProductCatalogProps {
  products: Product[];
}

export function ProductCatalog({ products }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [priceBucket, setPriceBucket] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"any" | "in-stock" | "featured">("any");
  const [sortOrder, setSortOrder] = useState<"none" | "low-high" | "high-low">("none");

  const filtered = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    const bucket = priceBucket
      ? PRICE_BUCKETS.find((candidate) => candidate.id === priceBucket) ?? null
      : null;

    const matched = products.filter((product) => {
      if (stockFilter === "in-stock" && product.stock === "outOfStock") return false;
      if (stockFilter === "featured" && !product.featured) return false;

      const startingPrice = getStartingPrice(product);
      if (bucket) {
        if (startingPrice === undefined) return false;
        if (startingPrice < bucket.min) return false;
        if (startingPrice >= bucket.max) return false;
      }

      if (!normalisedQuery) return true;
      const haystack = [
        product.name,
        product.brand,
        product.description,
        ...(product.tags ?? []),
        ...product.colors.map((color) => color.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalisedQuery);
    });

    if (sortOrder === "low-high") {
      return [...matched].sort((a, b) => (getStartingPrice(a) ?? 0) - (getStartingPrice(b) ?? 0));
    }
    if (sortOrder === "high-low") {
      return [...matched].sort((a, b) => (getStartingPrice(b) ?? 0) - (getStartingPrice(a) ?? 0));
    }

    return matched;
  }, [products, query, priceBucket, stockFilter, sortOrder]);

  const hasActiveFilter = query.trim().length > 0 || priceBucket !== null || stockFilter !== "any";

  return (
    <div className="text-slate-900">
      <div className="mb-8 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="relative block">
          <span className="sr-only">Search mobiles</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search brand, model, feature (e.g. AMOLED, flagship)"
            aria-label="Search mobiles"
            className="min-h-14 w-full rounded-full border border-slate-300 bg-slate-50 pl-14 pr-13 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Price
          </span>
          <PillButton active={priceBucket === null} onClick={() => setPriceBucket(null)}>
            Any
          </PillButton>
          {PRICE_BUCKETS.map((bucket) => (
            <PillButton
              key={bucket.id}
              active={priceBucket === bucket.id}
              onClick={() => setPriceBucket(bucket.id)}
            >
              {bucket.label}
            </PillButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            Availability
          </span>
          {STOCK_FILTERS.map((option) => (
            <PillButton
              key={option.id}
              active={stockFilter === option.id}
              onClick={() => setStockFilter(option.id)}
            >
              {option.label}
            </PillButton>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-2">
        <p className="text-sm font-medium text-slate-500">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> phone{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-3">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            aria-label="Sort by price"
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="none">Sort by</option>
            <option value="low-high">Price: Low to High</option>
            <option value="high-low">Price: High to Low</option>
          </select>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPriceBucket(null);
                setStockFilter("any");
              }}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid min-h-[320px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 mt-6 shadow-sm">
          <p className="text-lg font-medium text-slate-500">
            No mobiles match your filters. Try clearing them or browse all models.
          </p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => {
              setQuery("");
              setPriceBucket(null);
              setStockFilter("any");
              setSortOrder("none");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-4 text-sm font-semibold transition-all",
        active
          ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      )}
    >
      {children}
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  const startingPrice = getFlipkartPrice(product);
  const enquiryOnly = isPriceOnEnquiry(product);

  return (
    <article className="group relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      <Link
        href={`/products/${product.slug}`}
        className="relative flex h-56 items-center justify-center overflow-hidden bg-slate-50 p-6 transition-colors group-hover:bg-slate-100/50"
      >
        <Image
          src={product.image}
          alt={`${product.name} - ${product.brand} smartphone`}
          fill
          className="object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        <span
          className={`absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
            product.stock === "inStock"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : product.stock === "limited"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {product.stock === "inStock"
            ? "In Stock"
            : product.stock === "limited"
              ? "Limited"
              : "Out of Stock"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-4">
        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-blue-600">
            {product.brand}
          </span>
          <Link href={`/products/${product.slug}`} className="block">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
              {product.name}
            </h2>
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          {product.colors && product.colors.length > 0 && (
            <div className="flex -space-x-1">
              {product.colors.slice(0, 3).map((color, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: color.hex || "#333333" }}
                  title={color.name}
                />
              ))}
            </div>
          )}
          <span className="text-xs font-medium text-slate-500">
            {product.colors?.length
              ? product.colors.map((c) => c.name).join(", ")
              : "Various colors"}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mt-1">
          {product.variants.map((variant) => (
            <span
              key={`${variant.ram}-${variant.storage}-${variant.price}`}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600"
            >
              {variant.ram}/{variant.storage}
            </span>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500 mb-0.5">Starting from</p>
          <p className="text-xl font-extrabold text-slate-900">
            {enquiryOnly ? "Price on Enquiry" : formatPrice(startingPrice ?? 0)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-sm rounded-lg"
            as={Link}
            href={`/checkout?product=${product.slug}`}
          >
            <ShoppingBag className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Buy Now
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-sm rounded-lg"
            as={Link}
            href={`/products/${product.slug}`}
          >
            <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Details
          </Button>
        </div>
      </div>
    </article>
  );
}
