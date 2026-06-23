"use client";

import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/data/brands";
import { useCallback } from "react";

export function BrandFilter({
  brands,
  activeBrand,
}: {
  brands: Brand[];
  activeBrand: string | null;
}) {
  const router = useRouter();

  const handleClick = useCallback(
    (slug: string | null) => {
      router.push(slug ? `/products?brand=${slug}` : `/products`, {
        scroll: false,
      });
    },
    [router]
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => handleClick(null)}
        aria-pressed={activeBrand === null}
        className={`min-h-11 rounded-full px-5 text-sm font-bold transition-all duration-200 ${
          activeBrand === null
            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-100 scale-105"
            : "border border-slate-200 bg-slate-50 text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 hover:shadow-md active:scale-95"
        }`}
      >
        All
      </button>
      {brands.map((brand) => (
        <button
          key={brand.slug}
          type="button"
          onClick={() => handleClick(activeBrand === brand.slug ? null : brand.slug)}
          aria-pressed={activeBrand === brand.slug}
          className={`min-h-11 rounded-full px-5 text-sm font-bold transition-all duration-200 ${
            activeBrand === brand.slug
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-100 scale-105"
              : "border border-slate-200 bg-slate-50 text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 hover:shadow-md active:scale-95"
          }`}
        >
          {brand.name}
        </button>
      ))}
    </div>
  );
}
