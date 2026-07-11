"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { Nav } from "@/components/layout/nav";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { CartProvider } from "@/context/CartContext";
import { SanityLive } from "@/sanity/lib/live";
import type { SanitySiteSettings } from "@/sanity/types";

export function SiteChrome({
  settings,
  isDraftMode,
  children,
}: {
  settings: SanitySiteSettings;
  isDraftMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith("/studio");

  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <CartProvider>
      <Nav settings={settings} />
      <main id="main">{children}</main>
      <WhatsAppFloat settings={settings} />
      {isDraftMode && process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && <SanityLive />}
      <Toaster position="top-right" theme="dark" />
    </CartProvider>
  );
}
