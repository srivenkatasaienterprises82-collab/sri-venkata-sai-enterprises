import { siteConfig } from "./siteConfig";

export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Single source of truth for FAQ content.
 * Consumed by the FAQ section component and by the FAQPage JSON-LD schema
 * on the homepage (for Google rich results).
 */
export const faqs: FAQItem[] = [
  {
    question: "Do you provide EMI options?",
    answer:
      "Yes, we offer 0% EMI on all major brands (Apple, Samsung, OnePlus, Vivo, Oppo, Motorola) through leading banks and NBFCs. Instant approval with minimal documentation. Ask us on WhatsApp for current EMI offers.",
  },
  {
    question: "Do you accept old phone exchange?",
    answer:
      "Absolutely. We accept old smartphones for exchange and offer competitive values — often better than online quotes. Bring your device to our Ongole store for instant valuation, or share details on WhatsApp for a preliminary estimate.",
  },
  {
    question: "Are all products 100% genuine with warranty?",
    answer:
      "Yes. Every smartphone we sell is 100% genuine, sourced from authorized distributors. Each device comes with official brand warranty (1 year standard), original box, accessories, and a valid GST invoice.",
  },
  {
    question: "Can I check color and storage availability before ordering?",
    answer:
      "Yes! Message us on WhatsApp with the model you're interested in. We'll confirm real-time stock for your preferred color and storage variant, along with any running offers.",
  },
  {
    question: "Do you provide accessories like cases and screen protectors?",
    answer:
      "We stock a wide range of accessories — premium cases, tempered glass, chargers, cables, and earphones for all popular models. Accessory combos start at ₹499. Add them to your order at checkout.",
  },
  {
    question: "Is store pickup available? Where are you located?",
    answer:
      `Yes, you can pick up from our store in ${siteConfig.address.city}. We're at ${siteConfig.address.line2}, ${siteConfig.address.line3}, ${siteConfig.address.line4}. Store hours: ${siteConfig.hours}. Call or WhatsApp before visiting to reserve your device.`,
  },
  {
    question: "Do you deliver outside Ongole?",
    answer:
      "We deliver across Andhra Pradesh and Telangana via trusted logistics partners. Delivery charges apply based on location. COD available for select pincodes. Message us with your pincode to confirm.",
  },
  {
    question: "What if I have issues after purchase?",
    answer:
      "We provide local after-sales support. For warranty claims, we coordinate directly with brand service centers. For accessories or minor issues, visit our store — we'll help resolve it quickly.",
  },
];
