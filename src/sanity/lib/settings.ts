import { sanityFetch } from "@/sanity/lib/live";
import { SITE_SETTINGS_QUERY } from "@/sanity/queries";
import { siteConfig } from "@/lib/data/siteConfig";
import type { SanitySiteSettings } from "@/sanity/types";

export async function getSiteSettings(): Promise<SanitySiteSettings> {
  try {
    const { data: settings } = await sanityFetch({ query: SITE_SETTINGS_QUERY }) as { data: SanitySiteSettings | null };
    if (!settings || !settings.companyName) {
      throw new Error("No settings in Sanity");
    }
    return settings;
  } catch (err) {
    console.warn("⚠️ Failed to load site settings from Sanity, falling back to static config:", err);
    return {
      companyName: siteConfig.storeName,
      companyShortName: siteConfig.storeShortName,
      tagline: siteConfig.tagline,
      phoneDisplay: siteConfig.phoneDisplay,
      phoneTel: siteConfig.phoneTel,
      whatsappNumber: siteConfig.whatsappNumber,
      addressLine1: siteConfig.address.line1,
      addressLine2: siteConfig.address.line2,
      addressLine3: siteConfig.address.line3,
      addressLine4: siteConfig.address.line4,
      city: siteConfig.address.city,
      pincode: siteConfig.address.pincode,
      hours: siteConfig.hours,
      footerText: "Premium mobile store in Ongole. Shop genuine smartphones, tablets, and accessories with official brand warranty, best pricing, EMI facilities, and reliable after-sales support.",
      copyrightText: "© 2026 Sri Venkata Sai Enterprises. All rights reserved.",
      seoTitleTemplate: `${siteConfig.storeName} | Premium Mobile Store in ${siteConfig.address.city}`,
      seoDescription: `Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo & Motorola. Best prices, EMI options, exchange offers, and fast local service in ${siteConfig.address.city}.`,
    };
  }
}
export default getSiteSettings;
