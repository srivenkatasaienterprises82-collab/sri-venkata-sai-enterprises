import { Metadata } from "next";
import { getSiteSettings } from "@/sanity/lib/settings";
import { siteUrl } from "@/lib/siteUrl";
import { safeSanityFetch } from "@/sanity/lib/live";
import { SEARCH_PRODUCTS_QUERY } from "@/sanity/queries";
import { resolveImage } from "@/sanity/lib/image";
import type { SearchProduct } from "@/components/layout/product-search";

// Re-render on every request and re-fetch Sanity each time, so content
// published in the Studio (products, logo, settings) appears without a redeploy.
export const dynamic = "force-dynamic";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SanityLive } from "@/sanity/lib/live";
import "./globals.css";

function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      Skip to main content
    </a>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const titleTemplate = settings.companyShortName
    ? `%s | ${settings.companyShortName}`
    : `%s | ${settings.companyName}`;
  const keywords = settings.seoKeywords || [
    `mobiles ${settings.city || "Ongole"}`,
    `smartphones ${settings.city || "Ongole"}`,
    settings.companyName,
    `mobile store ${settings.city || "Ongole"}`,
  ];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.seoTitleTemplate || `${settings.companyName} | Premium Mobile Store in ${settings.city || "Ongole"}`,
      template: titleTemplate,
    },
    description: settings.seoDescription || `Sri Venkata Sai Enterprises is the leading mobile phone store in Ongole. Buy iPhone, Samsung, Vivo, Oppo, Realme, OnePlus, Redmi and accessories at the best prices.`,
    keywords: keywords,
    icons: {
      icon: "/favicon.ico",
      apple: [{ url: (typeof settings.logo === "string" ? settings.logo : "/logo.jpg") }],
    },
    openGraph: {
      type: "website",
      siteName: settings.companyName,
      title: settings.seoTitleTemplate || `${settings.companyName} | Premium Mobile Store in ${settings.city || "Ongole"}`,
      description: settings.seoDescription || `Sri Venkata Sai Enterprises is the leading mobile phone store in Ongole. Buy iPhone, Samsung, Vivo, Oppo, Realme, OnePlus, Redmi and accessories at the best prices.`,
      images: [{ url: (typeof settings.openGraphImage === "string" ? settings.openGraphImage : typeof settings.logo === "string" ? settings.logo : "/logo.jpg"), width: 320, height: 320, alt: settings.companyName }],
    },
  };
}

import { draftMode } from "next/headers";

interface SearchRow {
  _id: string;
  name: string;
  slug?: { current?: string };
  tags?: string[];
  price?: number | null;
  flipkartPrice?: number | null;
  amazonPrice?: number | null;
  priceOnEnquiry?: boolean;
  coverImage?: unknown;
  brandName?: string | null;
  variantPrices?: (number | null)[];
  variantFlipkartPrices?: (number | null)[];
  variantAmazonPrices?: (number | null)[];
}

/** Header search data: Sanity only, so it never lists products that no longer exist. */
async function getSearchProducts(): Promise<SearchProduct[]> {
  const { data } = await safeSanityFetch<SearchRow[]>({ query: SEARCH_PRODUCTS_QUERY });
  return (data ?? []).map((row) => {
    // Same preference as getStartingPrice(): live marketplace prices first,
    // then the seed price. Search must agree with the PDP and checkout.
    const positive = (prices: (number | null | undefined)[] | undefined) =>
      (prices ?? []).filter((price): price is number => typeof price === "number" && price > 0);
    const marketPrices = [
      ...positive(row.variantFlipkartPrices),
      ...positive(row.variantAmazonPrices),
    ];
    const price = marketPrices.length
      ? Math.min(...marketPrices)
      : positive([row.flipkartPrice, row.amazonPrice, row.price])[0];

    return {
      id: row._id,
      name: row.name,
      slug: row.slug?.current ?? row._id,
      brand: row.brandName ?? "",
      tags: row.tags ?? [],
      image: resolveImage(row.coverImage) || "/logo.jpg",
      price,
      priceOnEnquiry: row.priceOnEnquiry,
    };
  });
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, searchProducts] = await Promise.all([
    getSiteSettings(),
    getSearchProducts(),
  ]);
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener("DOMContentLoaded",()=>document.querySelectorAll("[bis_skin_checked]").forEach(e=>e.removeAttribute("bis_skin_checked")));`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen max-w-full overflow-x-hidden bg-white text-slate-900 antialiased">
        <SkipLink />
        <SiteChrome settings={settings} searchProducts={searchProducts}>{children}</SiteChrome>
        {isDraftMode && process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && <SanityLive />}
      </body>
    </html>
  );
}
