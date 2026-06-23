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
  phoneDisplay: "+91 99486 18414",
  phoneTel: "+919948618414",
  whatsappNumber: "919948618414",
  whatsappUrl: "https://wa.me/919948618414",

  // Address
  address: {
    line1: "Sri Venkata Sai Enterprises",
    line2: "Shop No 2, Pushpa Medicals Back Side",
    line3: "Beside Tanishq Jewellers",
    line4: "Kurnool Road, Ongole - 523001",
    city: "Ongole",
    pincode: "523001",
  },

  // Hours
  hours: "Mon – Sun: 10:00 AM – 9:00 PM",

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
