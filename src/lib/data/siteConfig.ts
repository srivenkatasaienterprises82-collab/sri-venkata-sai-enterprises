/**
 * Central site configuration.
 * Change business details here — they propagate to the nav, footer,
 * contact section, WhatsApp float, order API, and order forms.
 */
export const siteConfig = {
  storeName: "Sri Venkata Sai Enterprises",
  storeShortName: "Sri Venkata Sai",
  tagline: "Ongole's #1 Mobile Store",

  // Contact
  // Keep these in sync with siteSettings in Sanity (the live source for the
  // nav, footer and contact section). Used as the offline fallback only.
  phoneDisplay: "+91 7670859484",
  phoneTel: "+917670859484",
  whatsappNumber: "917670859484",
  whatsappUrl: "https://wa.me/917670859484",

  // Address
  address: {
    line1: "Sri Venkata Sai Enterprises",
    line2: "Shop No 2, Pushpa Medicals Back Side",
    line3: "Beside Tanishq Jewellers",
    line4: "Kurnool Road, Ongole - 523001",
    city: "Ongole",
    pincode: "523001",
    googleMapsUrl: "https://maps.app.goo.gl/JEa4w8bcfo745e7g6",
  },

  // Hours
  // Confirmed by the owner on 2026-10-30 (Google Business Profile says 9–10).
  hours: "Mon – Sun: 9:00 AM – 10:00 PM",

  // Rating shown across the site (sourced from Justdial — keep in sync).
  rating: "4.8",
  ratingValue: 4.8,
  reviewCount: 109,
  ratingSourceUrl:
    "https://www.justdial.com/Ongole/Sri-Venkata-Sai-Enterprises-Opposite-Sivalayam-Street-East-Kammapalem/9999P8592-8592-210301000525-I4X6_BZDET",
  happyCustomers: "4,500+",
  phonesInStock: "150+",
} as const;

export const phoneTel = siteConfig.phoneTel;
export const whatsappUrl = siteConfig.whatsappUrl;
