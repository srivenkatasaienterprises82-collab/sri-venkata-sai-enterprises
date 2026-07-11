"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { Nav } from "@/components/layout/nav";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { CartProvider } from "@/context/CartContext";
import type { SanitySiteSettings } from "@/sanity/types";

export function SiteChrome({
  settings,
  children,
}: {
  settings: SanitySiteSettings;
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
      <Toaster position="top-right" theme="dark" />
    </CartProvider>
  );
}
