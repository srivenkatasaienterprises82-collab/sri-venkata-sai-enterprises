import { Metadata } from "next";
import { Toaster } from "sonner";
import { Nav } from "@/components/layout/nav";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { CartProvider } from "@/context/CartContext";
import { siteConfig } from "@/lib/data/siteConfig";
import { SanityLive } from "@/sanity/lib/live";
import "./globals.css";

function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      Skip to main content
    </a>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${siteConfig.storeName} | Premium Mobile Store in ${siteConfig.address.city}`,
    template: `%s | ${siteConfig.storeName}`,
  },
  description:
    `Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo & Motorola. Best prices, EMI options, exchange offers, and fast local service in ${siteConfig.address.city}.`,
  keywords: [
    `mobiles ${siteConfig.address.city}`,
    `smartphones ${siteConfig.address.city}`,
    siteConfig.storeName,
    `mobile store ${siteConfig.address.city}`,
    `Vivo ${siteConfig.address.city}`,
    `iQOO ${siteConfig.address.city}`,
    `Samsung ${siteConfig.address.city}`,
    `best mobile shop ${siteConfig.address.city}`,
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.jpg" }],
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.storeName,
    title: `${siteConfig.storeName} | Premium Mobile Store in ${siteConfig.address.city}`,
    description:
      `Shop genuine smartphones with EMI options, exchange offers, and personal buying help in ${siteConfig.address.city}.`,
    images: [{ url: "/logo.jpg", width: 320, height: 320, alt: siteConfig.storeName }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
  <body suppressHydrationWarning className="min-h-screen bg-white text-slate-900 antialiased">
    <SkipLink />
    <CartProvider>
      <Nav />
      <div id="main">
        {children}
      </div>
      <WhatsAppFloat />
          <SanityLive />
          <Toaster position="top-right" theme="dark" />
        </CartProvider>
      </body>
    </html>
  );
}
