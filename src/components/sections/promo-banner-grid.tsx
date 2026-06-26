"use client";

import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    id: 1,
    src: "/images/promo-banner/promo-1.png",
    alt: "Latest smartphone deals and offers at Sri Venkata Sai Enterprises",
    href: "/products",
  },
  {
    id: 2,
    src: "/images/promo-banner/promo-2.png",
    alt: "EMI and exchange offers on branded smartphones",
    href: "/products",
  },
  {
    id: 3,
    src: "/images/promo-banner/promo-3.png",
    alt: "New arrivals in Samsung, Vivo, and iPhone models",
    href: "/products",
  },
  {
    id: 4,
    src: "/images/promo-banner/promo-4.png",
    alt: "Accessories and gadgets for all phone brands",
    href: "/products",
  },
];

export function PromoBannerGrid() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {cards.map((card) => (
            <div key={card.id}>
              <Link
                href={card.href}
                className="group block overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/60 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1"
              >
                <Image
                  src={card.src}
                  alt={card.alt}
                  width={800}
                  height={500}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="h-auto w-full object-contain"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PromoBannerGrid;
