export interface Testimonial {
  name: string;
  location: string;
  rating: number;
  text: string;
  source: "google" | "whatsapp" | "manual";
}

export const testimonials: Testimonial[] = [
  {
    name: "Ramesh Kumar",
    location: "Ongole",
    rating: 5,
    text: "Bought iPhone 15 Pro from here. Got the best price in Ongole, EMI was instant, and they even applied a screen protector for free. Genuine product with box and bill.",
    source: "google",
  },
  {
    name: "Priya Reddy",
    location: "Chirala",
    rating: 5,
    text: "Exchanged my old OnePlus for a Samsung S24. They gave fair exchange value, better than online offers. Delivery was same day. Very professional team.",
    source: "whatsapp",
  },
  {
    name: "Venkat Rao",
    location: "Ongole",
    rating: 5,
    text: "Visited the store for my parents' phone. Staff was patient, explained everything clearly without pushing expensive models. Parents are happy with their new Vivo.",
    source: "google",
  },
  {
    name: "Anita Singh",
    location: "Kandukur",
    rating: 5,
    text: "Ordered online, paid on delivery. Phone arrived sealed with warranty card. Called them for EMI query post-purchase — they answered immediately. Rare service!",
    source: "whatsapp",
  },
  {
    name: "Srinivas Reddy",
    location: "Ongole",
    rating: 5,
    text: "Best mobile shop in Ongole. I've been buying phones from here for 3 years. Always genuine products, fair prices, and the staff remembers you by name.",
    source: "google",
  },
  {
    name: "Lakshmi Devi",
    location: "Addanki",
    rating: 5,
    text: "My son ordered a Vivo phone from the website. Very smooth process — WhatsApp confirmation was instant and delivery came next day with all accessories.",
    source: "whatsapp",
  },
];

export function getAllTestimonials(): Testimonial[] {
  return testimonials;
}
