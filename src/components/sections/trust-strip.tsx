import { Clock, ShieldCheck, Star, Users } from "lucide-react";
import { siteConfig } from "@/lib/data/siteConfig";

/**
 * Trust stats are server-rendered as final text. The previous version animated
 * "4500+" from 0 and showed a hardcoded "4.9" whenever Sanity settings were
 * present, which meant crawlers and first paint saw "0+" and a rating that
 * contradicted the 4.8 shown in the LocalBusiness schema.
 */
const stats = [
  { icon: Star, value: siteConfig.rating, label: "Customer rating" },
  { icon: Users, value: siteConfig.happyCustomers, label: "Happy customers" },
  { icon: ShieldCheck, value: "100%", label: "Genuine products" },
  { icon: Clock, value: "10-9", label: "Open every day" },
];

export function TrustStrip() {
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
            <span className="text-[22px] font-extrabold text-slate-900">{stat.value}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
