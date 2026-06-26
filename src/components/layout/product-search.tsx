"use client";

import { useState, useEffect, useRef, useMemo, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { products, getStartingPrice, isPriceOnEnquiry, formatPrice } from "@/lib/data/products";

interface ProductSearchProps {
  onSelect?: () => void;
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const inputId = useId();
  const labelId = `${inputId}-label`;
  const listboxId = `${inputId}-listbox`;
  // Stable option ids for aria-activedescendant wiring.
  const optionId = (index: number) => `${inputId}-option-${index}`;

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.brand.toLowerCase().includes(lowerQuery) ||
          p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
      )
      .slice(0, 6);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        router.push(`/products/${results[selectedIndex].slug}`);
        setIsOpen(false);
        setQuery("");
        onSelect?.();
      } else if (results.length > 0) {
        router.push(`/products/${results[0].slug}`);
        setIsOpen(false);
        setQuery("");
        onSelect?.();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  function priceLabel(product: (typeof products)[number]) {
    if (isPriceOnEnquiry(product)) return "Price on Enquiry";
    const price = getStartingPrice(product);
    return price !== undefined ? formatPrice(price) : "Price on Enquiry";
  }

  const activeOptionId =
    selectedIndex >= 0 && selectedIndex < results.length
      ? optionId(selectedIndex)
      : undefined;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <span id={labelId} className="sr-only">
        Search products and brands
      </span>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-labelledby={labelId}
          id={inputId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products, brands..."
          className="h-9 w-full rounded-full border border-slate-100 bg-slate-100/60 pl-10 pr-10 text-sm outline-none transition-all focus:border-blue-500/80 focus:bg-white focus:ring-2 focus:ring-blue-100/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

        {isOpen && query.trim() && (
          <div
            className="animate-fade-in absolute top-full mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl max-h-[360px] overflow-y-auto"
            role="listbox"
            id={listboxId}
            aria-label="Product search results"
          >
            {results.length > 0 ? (
              <div className="flex flex-col py-2">
                {results.map((product, index) => (
                  <Link
                    key={product.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    href={`/products/${product.slug}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      onSelect?.();
                    }}
                    className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                      index === selectedIndex ? "bg-slate-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-white">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {product.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {priceLabel(product)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-slate-500">
                No products found for &quot;{query}&quot;
              </div>
            )}
          </div>
        )}
    </div>
  );
}
