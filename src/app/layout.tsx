import { Metadata } from "next";
import { getSiteSettings } from "@/sanity/lib/settings";

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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://srivenkatasaienterprises.com"),
    title: {
      default: settings.seoTitleTemplate || `${settings.companyName} | Premium Mobile Store in ${settings.city || "Ongole"}`,
      template: titleTemplate,
    },
    description: settings.seoDescription || `Sri Venkata Sai Enterprises is the leading mobile phone store in Ongole. Buy iPhone, Samsung, Vivo, Oppo, Realme, OnePlus, Redmi and accessories at the best prices.`,
    keywords: keywords,
    icons: {
      icon: "/favicon.ico",
      apple: [{ url: settings.logo || "/logo.jpg" }],
    },
    openGraph: {
      type: "website",
      siteName: settings.companyName,
      title: settings.seoTitleTemplate || `${settings.companyName} | Premium Mobile Store in ${settings.city || "Ongole"}`,
      description: settings.seoDescription || `Sri Venkata Sai Enterprises is the leading mobile phone store in Ongole. Buy iPhone, Samsung, Vivo, Oppo, Realme, OnePlus, Redmi and accessories at the best prices.`,
      images: [{ url: settings.openGraphImage || settings.logo || "/logo.jpg", width: 320, height: 320, alt: settings.companyName }],
    },
  };
}

import { draftMode } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
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
      <body suppressHydrationWarning className="min-h-screen bg-white text-slate-900 antialiased">
        <SkipLink />
        <SiteChrome settings={settings}>{children}</SiteChrome>
        {isDraftMode && process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && <SanityLive />}
      </body>
    </html>
  );
}
