"use client";

import Image from "next/image";
import Link from "next/link";

export interface PromoBanner {
  id: string | number;
  src: string;
  alt: string;
  href: string;
}

export function PromoBannerGrid({ banners }: { banners?: PromoBanner[] }) {
  // Banners are managed in Sanity Studio (Banners collection). With none
  // published there is nothing to show — no hardcoded product promos.
  if (!banners?.length) return null;

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
          {banners.map((card) => (
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
