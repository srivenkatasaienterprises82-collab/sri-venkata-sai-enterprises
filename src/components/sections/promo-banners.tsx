"use client";

import Image from "next/image";
import Link from "next/link";

const banners = [
  {
    id: "iqoo-neo-10",
    badge: "Power to Win",
    title: "iQOO Neo 10 5G",
    subtitle: "120W FlashCharge · Snapdragon 7 Gen 3",
    cta: "Shop Now",
    bg: "#D6EEF5",
    ctaBg: "bg-slate-800 hover:bg-slate-700 text-white",
    image: "/images/banners/iqoo-neo10-banner.png",
    alt: "iQOO Neo 10 5G",
    href: "/products/iqoo-neo-10",
  },
  {
    id: "vivo-v70",
    title: "vivo V70",
    subtitle: "ZEISS Portrait Photography",
    cta: "Buy Now",
    bg: "#F9E8E0",
    ctaBg: "bg-slate-800 hover:bg-slate-700 text-white",
    image: "/images/banners/vivo-v70-banner.webp",
    alt: "vivo V70",
    href: "/products/vivo-v70",
  },
  {
    id: "iqoo-neo-10-pro",
    title: "iQOO Neo 10 Pro",
    subtitle: "Most Advanced · AnTuTu 2.91Mn+",
    cta: "Shop Now",
    bg: "#2a2e40",
    ctaBg: "bg-blue-600 hover:bg-blue-700 text-white",
    image: "/images/banners/iqoo-neo10pro-banner.png",
    alt: "iQOO Neo 10 Pro",
    href: "/products/iqoo-neo-10-pro",
  },
];

export default function PromoBanners() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {banners.map((banner) => (
          <Link
            key={banner.id}
            href={banner.href}
            className="group relative flex min-h-[200px] items-center overflow-hidden rounded-xl"
            style={{ backgroundColor: banner.bg }}
          >
            <div className="relative z-10 flex w-1/2 flex-col gap-2 px-5 py-6">
              {banner.badge && (
                <span className="w-fit rounded bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {banner.badge}
                </span>
              )}
              <h3
                className={`text-lg font-extrabold leading-tight ${
                  banner.id === "iqoo-neo-10-pro" ? "text-white" : "text-slate-900"
                }`}
              >
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p
                  className={`text-xs font-semibold ${
                    banner.id === "iqoo-neo-10-pro" ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {banner.subtitle}
                </p>
              )}
              <span
                className={`mt-1 w-fit rounded-lg px-4 py-2 text-center text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 ${banner.ctaBg}`}
              >
                {banner.cta}
              </span>
            </div>
            <div className="absolute right-0 top-0 flex h-full w-3/5 items-center justify-center">
              <div className="relative h-full w-full">
                <Image
                  src={banner.image}
                  alt={banner.alt}
                  fill
                  className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 20vw"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
