import { Metadata } from "next";
import { Toaster } from "sonner";
import { Nav } from "@/components/layout/nav";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { CartProvider } from "@/context/CartContext";
import { getSiteSettings } from "@/sanity/lib/settings";
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
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: {
      default: settings.seoTitleTemplate || `${settings.companyName} | Premium Mobile Store in ${settings.city || "Ongole"}`,
      template: titleTemplate,
    },
    description: settings.seoDescription || `Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo & Motorola. Best prices, EMI options, exchange offers, and fast local service in ${settings.city || "Ongole"}.`,
    keywords: keywords,
    icons: {
      icon: "/favicon.ico",
      apple: [{ url: settings.logo || "/logo.jpg" }],
    },
    openGraph: {
      type: "website",
      siteName: settings.companyName,
      title: settings.seoTitleTemplate || `${settings.companyName} | Premium Mobile Store in ${settings.city || "Ongole"}`,
      description: settings.seoDescription || `Shop genuine smartphones with EMI options, exchange offers, and personal buying help in ${settings.city || "Ongole"}.`,
      images: [{ url: settings.openGraphImage || settings.logo || "/logo.jpg", width: 320, height: 320, alt: settings.companyName }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

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
        <CartProvider>
          <Nav settings={settings} />
          <div id="main">{children}</div>
          <WhatsAppFloat settings={settings} />
          {process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && <SanityLive />}
          <Toaster position="top-right" theme="dark" />
        </CartProvider>
      </body>
    </html>
  );
}
