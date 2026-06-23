import Image from "next/image";
import Link from "next/link";

import { safeSanityFetch } from "@/sanity/lib/live";
import { BANNERS_QUERY } from "@/sanity/queries";

type Banner = {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  cta?: string;
  backgroundColor?: string;
  image?: string;
  link?: string;
};

function isDark(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 140;
}

export default async function PromoBanners() {
  const { data: banners } = await safeSanityFetch({ query: BANNERS_QUERY }) as { data: Banner[] | null };

  if (!banners?.length) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {banners.map((banner) => {
          const dark = isDark(banner.backgroundColor || "#D6EEF5");
          return (
            <Link
              key={banner._id}
              href={banner.link || "/"}
              className="group relative flex min-h-[200px] items-center overflow-hidden rounded-xl"
              style={{ backgroundColor: banner.backgroundColor || "#D6EEF5" }}
            >
              <div className="relative z-10 flex w-1/2 flex-col gap-2 px-5 py-6">
                {banner.badge && (
                  <span className="w-fit rounded bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {banner.badge}
                  </span>
                )}
                <h3
                  className={`text-lg font-extrabold leading-tight ${
                    dark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p
                    className={`text-xs font-semibold ${
                      dark ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {banner.subtitle}
                  </p>
                )}
                <span
                  className={`mt-1 w-fit rounded-lg px-4 py-2 text-center text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 ${
                    dark
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  {banner.cta || "Shop Now"}
                </span>
              </div>
              {banner.image && (
                <div className="absolute right-0 top-0 flex h-full w-3/5 items-center justify-center">
                  <div className="relative h-full w-full">
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
