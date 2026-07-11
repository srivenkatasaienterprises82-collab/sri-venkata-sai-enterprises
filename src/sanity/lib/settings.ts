import { sanityFetch } from "@/sanity/lib/live";
import { SITE_SETTINGS_QUERY } from "@/sanity/queries";
import { siteConfig } from "@/lib/data/siteConfig";
import type { SanitySiteSettings } from "@/sanity/types";
import { resolveImage } from "./image";

export async function getSiteSettings(): Promise<SanitySiteSettings> {
  try {
    const { data: settings } = await sanityFetch({ query: SITE_SETTINGS_QUERY }) as { data: SanitySiteSettings | null };
    if (!settings || !settings.companyName) {
      throw new Error("No settings in Sanity");
    }
    return {
      ...settings,
      logo: resolveImage(settings.logo),
      openGraphImage: resolveImage(settings.openGraphImage),
    };
  } catch (err) {
    console.warn(`⚠️ Failed to load site settings from Sanity, falling back to static config: ${err instanceof Error ? err.message : String(err)}`);
    return {
      companyName: siteConfig.storeName,
      companyShortName: siteConfig.storeShortName,
      tagline: siteConfig.tagline,
      logo: "",
      announcement: "Genuine Mobile Phones • Direct Store Warranty • Best Prices in Ongole",
      phoneDisplay: siteConfig.phoneDisplay,
      phoneTel: siteConfig.phoneTel,
      whatsappNumber: siteConfig.whatsappNumber,
      email: "info@srivenkatesai.com",
      addressLine1: siteConfig.address.line1,
      addressLine2: siteConfig.address.line2,
      addressLine3: siteConfig.address.line3,
      addressLine4: siteConfig.address.line4,
      city: siteConfig.address.city,
      pincode: siteConfig.address.pincode,
      hours: siteConfig.hours,
      googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3829.4355523996715!2d80.03632557591871!3d15.512699985090159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4b011400000001%3A0xc6cb1c7ea6bfdb!2sSri%20Venkata%20Sai%20Enterprises!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
      facebookUrl: "",
      instagramUrl: "https://www.instagram.com/sri_venkata_sai_enterprises/",
      youtubeUrl: "",
      linkedinUrl: "",
      footerText: "Premium mobile store in Ongole. Shop genuine smartphones, tablets, and accessories with official brand warranty, best pricing, EMI facilities, and reliable after-sales support.",
      copyrightText: "© 2026 Sri Venkata Sai Enterprises. All rights reserved.",
      seoTitleTemplate: `${siteConfig.storeName} | Premium Mobile Store in ${siteConfig.address.city}`,
      seoDescription: `Shop genuine smartphones from Apple, Samsung, Vivo, iQOO, Oppo & Motorola. Best prices, EMI options, exchange offers, and fast local service in ${siteConfig.address.city}.`,
      seoKeywords: ["mobile store", "smartphones", "Ongole", "iPhone", "Samsung", "Vivo", "Motorola", "OnePlus", "Realme"],
      openGraphImage: "",
    };
  }
}
export default getSiteSettings;
