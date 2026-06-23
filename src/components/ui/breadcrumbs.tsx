import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const PATH_MAP: Record<string, string> = {
  about: "About Us",
  contact: "Contact",
  "shipping-policy": "Shipping Policy",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
  products: "Mobiles",
  cart: "Cart",
  checkout: "Checkout",
};

function buildBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  let accumulated = "";
  for (const segment of segments) {
    accumulated += `/${segment}`;
    const label = PATH_MAP[segment] || decodeURIComponent(segment.replace(/-/g, " ")).replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ label, href: accumulated });
  }

  return items;
}

export async function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  // Resolve the pathname on the server so the JSON-LD is present in the
  // initial HTML Googlebot receives (previously rendered client-side only).
  let pathname = "/";
  try {
    const headerList = await headers();
    const referer = headerList.get("referer") || "";
    // Prefer the `x-pathname` / `x-invoke-path` conventions when present;
    // fall back to deriving from the referer URL.
    pathname =
      headerList.get("x-pathname") ||
      headerList.get("x-invoke-path") ||
      (referer ? new URL(referer).pathname : "/");
  } catch {
    pathname = "/";
  }

  const breadcrumbItems = items ?? buildBreadcrumbItems(pathname);

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL &&
    process.env.NEXT_PUBLIC_SITE_URL !== "http://localhost:3000"
      ? process.env.NEXT_PUBLIC_SITE_URL
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${baseUrl}${item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500" role="list">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <li key={`${item.href}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />}
                {isLast ? (
                  <span aria-current="page" className="font-semibold text-slate-700">{item.label}</span>
                ) : (
                  <Link href={item.href} className="hover:text-blue-600 transition-colors">{item.label}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
