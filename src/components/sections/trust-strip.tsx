"use client";

import { Clock, ShieldCheck, Star, Users } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { SanitySiteSettings } from "@/sanity/types";

function defaultStats(settings?: SanitySiteSettings) {
  return [
    { icon: Star, value: settings?.seoTitleTemplate ? "4.9" : siteConfig.rating, label: "Google rating", animated: false },
    { icon: Users, value: settings?.companyName ? "4500+" : siteConfig.happyCustomers, label: "Happy customers", animated: true, target: 4500, suffix: "+" },
    { icon: ShieldCheck, value: "100%", label: "Genuine products", animated: false },
    { icon: Clock, value: "10-9", label: "Open every day", animated: false },
  ];
}

export function TrustStrip({ settings }: { settings?: SanitySiteSettings }) {
  const stats = defaultStats(settings);
  return (
    <section className="border-y border-slate-200 bg-white px-6 py-8 sm:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-[22px] font-extrabold text-slate-900">
              {stat.animated ? (
                <NumberTicker target={stat.target!} suffix={stat.suffix} />
              ) : (
                stat.value
              )}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
