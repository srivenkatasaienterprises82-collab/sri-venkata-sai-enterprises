"use client";

import Image from "next/image";
import Link from "next/link";

export interface PromoBanner {
  id: string | number;
  src: string;
  alt: string;
  href: string;
}

const staticBanners: PromoBanner[] = [
  {
    id: 1,
    src: "/images/promo-banner/promo-1.png",
    alt: "iQOO 15 R smartphone - available at Sri Venkata Sai Enterprises",
    href: "/products/iqoo-15r",
  },
  {
    id: 2,
    src: "/images/promo-banner/promo-2.png",
    alt: "Motorola Edge 70 Pro - 200MP camera flagship phone",
    href: "/products/moto-edge-70-pro",
  },
  {
    id: 3,
    src: "/images/promo-banner/promo-3.png",
    alt: "iPhone 17 Series - iPhone 17, Pro, Pro Max and Air",
    href: "/category/apple",
  },
  {
    id: 4,
    src: "/images/promo-banner/promo-4.jpg",
    alt: "iQOO Neo 10 Pro",
    href: "/products/iqoo-neo-10-pro",
  },
];

export function PromoBannerGrid({ banners }: { banners?: PromoBanner[] }) {
  const displayBanners = banners && banners.length > 0 ? banners : staticBanners;

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {displayBanners.map((card) => (
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
                  priority
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
