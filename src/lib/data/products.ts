/**
 * Product catalog for Sri Venkata Sai Enterprises.
 *
 * Prices are indicative MRPs sourced from public listings (to be verified &
 * updated by the owner). The "priceOnEnquiry" flag, when true, hides the price
 * in the UI and shows "Price on Enquiry" / "Ask on WhatsApp".
 *
 * Images live under /public/images/products/<imageFolder>/1.<ext>. The
 * `image` field points to the cover image; the gallery reads the folder.
 */

export type ProductCategory =
  | "new-arrival"
  | "best-seller"
  | "deal"
  | "flagship"
  | "budget"
  | "accessory";

export type ProductType =
  | "smartphone"
  | "tablet"
  | "earbuds"
  | "accessory"
  | "feature-phone"
  | "router";

export type StockStatus = "inStock" | "limited" | "outOfStock";

export interface ProductVariant {
  ram: string;
  storage: string;
  /** Price in INR. Omit (undefined) when price is on enquiry only. */
  price?: number;
  originalPrice?: number;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  brandSlug: string;
  /** Folder name under /public/images/products/. */
  imageFolder: string;
  type: ProductType;
  category: ProductCategory;
  stock: StockStatus;
  /** Cover image. */
  image: string;
  description: string;
  colors: ProductColor[];
  variants: ProductVariant[];
  specifications: { label: string; value: string }[];
  featured: boolean;
  tags: string[];
  price?: number;
  originalPrice?: number;
  /** When true, price is hidden — enquiry only. */
  priceOnEnquiry?: boolean;
  amazonUrl?: string;
  flipkartUrl?: string;
}

/** Build a product entry; resolves `image` from the imageFolder automatically. */
function p(input: Omit<Product, "image"> & { image?: string }): Product {
  return {
    ...input,
    image: input.image ?? `/images/products/${input.imageFolder}/1.webp`,
  };
}

// ── Colour shortcuts ──
const C = {
  black: { name: "Black", hex: "#1A1A1A" },
  blue: { name: "Blue", hex: "#2563EB" },
  green: { name: "Green", hex: "#16A34A" },
  red: { name: "Red", hex: "#DC2626" },
  white: { name: "White", hex: "#F5F5F5" },
  gold: { name: "Gold", hex: "#D4AF37" },
  silver: { name: "Silver", hex: "#C0C0C0" },
  grey: { name: "Grey", hex: "#6B7280" },
  gray: { name: "Gray", hex: "#6B7280" },
  purple: { name: "Purple", hex: "#7C3AED" },
  violet: { name: "Violet", hex: "#7C3AED" },
  pink: { name: "Pink", hex: "#EC4899" },
  navy: { name: "Navy", hex: "#1E3A8A" },
  orange: { name: "Orange", hex: "#F97316" },
  indigo: { name: "Indigo", hex: "#4F46E5" },
  frost: { name: "Frost", hex: "#E0E7E9" },
  mint: { name: "Mint", hex: "#A7F3D0" },
  legend: { name: "Legend", hex: "#0F172A" },
  alpha: { name: "Alpha", hex: "#111827" },
  gibraltar: { name: "Gibraltar Sea", hex: "#1E40AF" },
  dryice: { name: "Dry Ice", hex: "#BAE6FD" },
  teal: { name: "Teal", hex: "#14B8A6" },
  lavender: { name: "Lavender", hex: "#C4B5FD" },
  brown: { name: "Brown", hex: "#8B5A2B" },
  yellow: { name: "Yellow", hex: "#EAB308" },
  emerald: { name: "Emerald", hex: "#10B981" },
} as const;

export const products: Product[] = [
  // ════════════════ VIVO ════════════════
  p({ id: "vivo-v70-elite", name: "Vivo V70 Elite", slug: "vivo-v70-elite", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-v70-elite", image: "/images/products/vivo-v70-elite/2.webp", type: "smartphone", category: "new-arrival", stock: "inStock", description: "The Elite edition of the V70 series with enhanced styling and performance.", colors: [C.red], variants: [{ ram: "8 GB", storage: "256 GB", price: 53999 }], specifications: [{ label: "Display", value: '6.78" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 8s Gen 4" }, { label: "Camera", value: "50MP ZEISS Triple Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "90W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+V70+Elite"
  }),
  p({ id: "vivo-v70", name: "Vivo V70", slug: "vivo-v70", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-v70", type: "smartphone", category: "new-arrival", stock: "inStock", description: "Vivo V70 - a premium mid-range phone with a stunning display, capable cameras, and a refined design.", colors: [C.black, C.yellow, C.red], variants: [{ ram: "8 GB", storage: "256 GB", price: 53999 }], specifications: [{ label: "Display", value: '6.77" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 7 Gen series" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+V70"
  }),
  p({ id: "vivo-v70-fe", name: "Vivo V70 FE", slug: "vivo-v70-fe", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-v70-fe", type: "smartphone", category: "deal", stock: "inStock", description: "A value-focused V70 variant - flagship looks at a friendlier price.", colors: [C.purple, C.blue], variants: [{ ram: "8 GB", storage: "128 GB", price: 37999 }, { ram: "8 GB", storage: "256 GB", price: 49999 }], specifications: [{ label: "Display", value: '6.67" AMOLED, 120Hz' }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+V70+FE"
  }),
  p({ id: "vivo-t4-lite", name: "Vivo T4 Lite", slug: "vivo-t4-lite", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t4-lite", type: "smartphone", category: "deal", stock: "inStock", description: "An affordable 5G phone with a big battery and a smooth display for everyday use.", colors: [C.gold, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 14999 }, { ram: "4 GB", storage: "128 GB", price: 16999 }], specifications: [{ label: "Display", value: '6.74" LCD, 90Hz' }, { label: "Processor", value: "Dimensity 6300" }, { label: "Battery", value: "6000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T4+Lite"
  }),
  p({ id: "vivo-t4x", name: "Vivo T4x", slug: "vivo-t4x", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t4x", type: "smartphone", category: "best-seller", stock: "inStock", description: "Vivo T4x balances style and speed with a big battery and reliable 5G performance.", colors: [C.blue, C.purple], variants: [{ ram: "8 GB", storage: "256 GB", price: 20999 }], specifications: [{ label: "Display", value: '6.72" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Dimensity 7300" }, { label: "Battery", value: "6500mAh" }, { label: "Charging", value: "44W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T4x"
  }),
  p({ id: "vivo-t4r", name: "Vivo T4R", slug: "vivo-t4r", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t4r", type: "smartphone", category: "best-seller", stock: "inStock", description: "The Vivo T4R is a versatile mid-ranger with up to 12 GB RAM for smooth multitasking.", colors: [C.white, C.blue], variants: [{ ram: "8 GB", storage: "128 GB", price: 22999 }, { ram: "8 GB", storage: "256 GB", price: 24999 }, { ram: "12 GB", storage: "256 GB", price: 26999 }], specifications: [{ label: "Display", value: '6.77" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 7s Gen series" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5700mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T4R"
  }),
  p({ id: "vivo-t4", name: "Vivo T4", slug: "vivo-t4", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t4", type: "smartphone", category: "best-seller", stock: "inStock", description: "The all-rounder of the T series - balanced performance, great camera, AMOLED display.", colors: [C.green, C.grey], variants: [{ ram: "8 GB", storage: "128 GB", price: 24999 }, { ram: "8 GB", storage: "256 GB", price: 26999 }, { ram: "12 GB", storage: "256 GB", price: 28999 }], specifications: [{ label: "Display", value: '6.77" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 7 Gen 3" }, { label: "Battery", value: "7300mAh" }, { label: "Charging", value: "90W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "AMOLED", "120Hz", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T4"
  }),
  p({ id: "vivo-t4-pro", name: "Vivo T4 Pro", slug: "vivo-t4-pro", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t4-pro", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A step-up T series device with a brighter display and faster charging.", colors: [C.blue, C.gold], variants: [{ ram: "8 GB", storage: "256 GB", price: 34999 }, { ram: "12 GB", storage: "256 GB", price: 39999 }], specifications: [{ label: "Display", value: '6.78" AMOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 8s Gen 4" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "90W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T4+Pro"
  }),
  p({ id: "vivo-t4-ultra", name: "Vivo T4 Ultra", slug: "vivo-t4-ultra", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t4-ultra", image: "/images/products/vivo-t4-ultra/2.webp", type: "smartphone", category: "flagship", stock: "limited", description: "The flagship of the T series - top-tier chipset, fast charging, and a premium build.", colors: [C.gold], variants: [{ ram: "12 GB", storage: "256 GB", price: 37999 }], specifications: [{ label: "Display", value: '6.78" AMOLED, 144Hz' }, { label: "Processor", value: "Dimensity 9400e" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "90W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "Flagship", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T4+Ultra"
  }),
  p({ id: "vivo-t5x", name: "Vivo T5x", slug: "vivo-t5x", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t5x", type: "smartphone", category: "new-arrival", stock: "inStock", description: "Latest 5G tech at a balanced price - great display, solid camera, reliable battery.", colors: [C.green, C.silver], variants: [{ ram: "6 GB", storage: "128 GB", price: 22999 }, { ram: "8 GB", storage: "128 GB", price: 24999 }, { ram: "8 GB", storage: "256 GB", price: 26999 }], specifications: [{ label: "Display", value: '6.72" LCD, 120Hz' }, { label: "Battery", value: "6500mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T5x"
  }),
  p({ id: "vivo-t5-pro", name: "Vivo T5 Pro", slug: "vivo-t5-pro", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-t5-pro", image: "/images/products/vivo-t5-pro/2.webp", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A premium T5 series phone with fast charging and an AMOLED display.", colors: [C.blue], variants: [{ ram: "8 GB", storage: "256 GB", price: 36999 }], specifications: [{ label: "Display", value: '6.78" AMOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 8s Gen series" }, { label: "Battery", value: "6000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+T5+Pro"
  }),
  p({ id: "vivo-y05", name: "Vivo Y05", slug: "vivo-y05", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-y05", image: "/images/products/vivo-y05/2.webp", type: "smartphone", category: "budget", stock: "inStock", description: "An entry-level Y series phone for everyday essentials.", colors: [C.green, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 12999 }], specifications: [{ label: "Display", value: '6.56" HD+' }, { label: "Battery", value: "5000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+Y05"
  }),
  p({ id: "vivo-y11", name: "Vivo Y11", slug: "vivo-y11", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-y11", type: "smartphone", category: "budget", stock: "inStock", description: "A compact, budget-friendly Y series phone with a dependable battery.", colors: [C.gold, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 14999 }], specifications: [{ label: "Display", value: '6.56" HD+' }, { label: "Battery", value: "5000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+Y11"
  }),
  p({ id: "vivo-y31", name: "Vivo Y31", slug: "vivo-y31", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-y31", type: "smartphone", category: "budget", stock: "inStock", description: "A stylish budget phone with a capable camera for the price.", colors: [C.red, C.green], variants: [{ ram: "6 GB", storage: "128 GB", price: 23999 }], specifications: [{ label: "Display", value: '6.58" FHD+' }, { label: "Battery", value: "5000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+Y31"
  }),
  p({ id: "vivo-y51-pro", name: "Vivo Y51 Pro", slug: "vivo-y51-pro", brand: "Vivo", brandSlug: "vivo", imageFolder: "vivo-y51-pro", type: "smartphone", category: "budget", stock: "inStock", description: "A mid-tier Y series phone with a large battery and clean design.", colors: [C.gold, C.red], variants: [{ ram: "8 GB", storage: "128 GB", price: 27999 }, { ram: "8 GB", storage: "256 GB", price: 30999 }], specifications: [{ label: "Display", value: '6.67" AMOLED' }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Vivo+Y51+Pro"
  }),

  // ════════════════ iQOO ════════════════
  p({ id: "iqoo-neo-10", name: "iQOO Neo 10", slug: "iqoo-neo-10", brand: "iQOO", brandSlug: "iqoo", imageFolder: "iqoo-neo-10", image: "/images/products/iqoo-neo-10/1.jpg", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A performance-focused Neo with a flagship-grade chipset for gamers.", colors: [C.white, C.black], variants: [{ ram: "8 GB", storage: "256 GB", price: 41999 }], specifications: [{ label: "Display", value: '6.78" AMOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 8s Gen 4" }, { label: "Camera", value: "50MP + 8MP" }, { label: "Battery", value: "7000mAh" }, { label: "Charging", value: "120W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "Gaming", "144Hz", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=iQOO+Neo+10"
  }),
  p({ id: "iqoo-15", name: "iQOO 15", slug: "iqoo-15", brand: "iQOO", brandSlug: "iqoo", imageFolder: "iqoo-15", image: "/images/products/iqoo-15/1.jpg", type: "smartphone", category: "flagship", stock: "inStock", description: "The flagship iQOO 15 — flagship silicon, fast charging, and a pro-grade display.", colors: [C.legend, C.alpha], variants: [{ ram: "12 GB", storage: "256 GB", price: 76999 }, { ram: "16 GB", storage: "512 GB", price: 83999 }], specifications: [{ label: "Display", value: '6.82" LTPO AMOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 8 Elite" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "Battery", value: "6500mAh" }, { label: "Charging", value: "120W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "Flagship", "Gaming", "120W Charging", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=iQOO+15"
  }),
  p({ id: "iqoo-15r", name: "iQOO 15R", slug: "iqoo-15r", brand: "iQOO", brandSlug: "iqoo", imageFolder: "iqoo-15r", image: "/images/products/iqoo-15r/1.jpg", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A more affordable 15 series with flagship-class performance.", colors: [C.silver, C.black], variants: [{ ram: "8 GB", storage: "256 GB", price: 49999 }, { ram: "12 GB", storage: "256 GB", price: 54999 }], specifications: [{ label: "Display", value: '6.78" AMOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 8s Gen 4" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "7000mAh" }, { label: "Charging", value: "90W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "Gaming", "144Hz", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=iQOO+15R"
  }),
  p({ id: "iqoo-z10-lite", name: "iQOO Z10 Lite", slug: "iqoo-z10-lite", brand: "iQOO", brandSlug: "iqoo", imageFolder: "iqoo-z10-lite", image: "/images/products/iqoo-z10-lite/1.jpg", type: "smartphone", category: "budget", stock: "inStock", description: "An entry 5G Z series device with a big battery at a budget price.", colors: [C.blue, C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 14999 }, { ram: "4 GB", storage: "128 GB", price: 16999 }], specifications: [{ label: "Display", value: '6.74" HD+ LCD, 90Hz' }, { label: "Processor", value: "Dimensity 6300" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "6000mAh", "Budget", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=iQOO+Z10+Lite"
  }),
  p({ id: "iqoo-z10r", name: "iQOO Z10R", slug: "iqoo-z10r", brand: "iQOO", brandSlug: "iqoo", imageFolder: "iqoo-z10r", image: "/images/products/iqoo-z10r/1.jpg", type: "smartphone", category: "deal", stock: "inStock", description: "A reliable mid-budget 5G phone with good cameras and solid battery.", colors: [C.white, C.blue], variants: [{ ram: "8 GB", storage: "128 GB", price: 22999 }, { ram: "8 GB", storage: "256 GB", price: 24999 }, { ram: "12 GB", storage: "256 GB", price: 26999 }], specifications: [{ label: "Display", value: '6.77" AMOLED, 120Hz' }, { label: "Processor", value: "Dimensity 7400" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5700mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=iQOO+Z10R"
  }),
  p({ id: "iqoo-z11x", name: "iQOO Z11x", slug: "iqoo-z11x", brand: "iQOO", brandSlug: "iqoo", imageFolder: "iqoo-z11x", image: "/images/products/iqoo-z11x/1.png", type: "smartphone", category: "best-seller", stock: "inStock", description: "Reliable performance with a big battery and smooth display.", colors: [C.green], variants: [{ ram: "6 GB", storage: "128 GB", price: 22999 }, { ram: "8 GB", storage: "128 GB", price: 24999 }], specifications: [{ label: "Display", value: '6.72" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 6 Gen 4" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6500mAh" }, { label: "Charging", value: "44W" }, { label: "OS", value: "Android, Funtouch OS" }], featured: true, tags: ["5G", "120Hz", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=iQOO+Z11x"
  }),

  // ════════════════ SAMSUNG ════════════════
  p({ id: "samsung-s26-plus", name: "Samsung Galaxy S26+", slug: "samsung-s26-plus", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-s26-plus", image: "/images/products/samsung-s26-plus/1.jpg", type: "smartphone", category: "flagship", stock: "inStock", description: "Samsung's flagship S26+ with a pro-grade camera system and a stunning display.", colors: [C.violet], variants: [{ ram: "12 GB", storage: "512 GB", price: 134999 }], specifications: [{ label: "Display", value: '6.9" Dynamic AMOLED 2X, 120Hz' }, { label: "Processor", value: "Snapdragon 8 Elite for Galaxy" }, { label: "Camera", value: "50 MP + 50 MP + 50 MP" }, { label: "Battery", value: "4900 mAh, 45W" }, { label: "OS", value: "Android, One UI" }], featured: true, tags: ["5G", "Flagship", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+S26+Plus"
  }),
  p({ id: "samsung-s25-ultra", name: "Samsung Galaxy S25 Ultra", slug: "samsung-s25-ultra", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-s25-ultra", image: "/images/products/samsung-s25-ultra/1.jpg", type: "smartphone", category: "flagship", stock: "limited", description: "The ultimate Samsung flagship with the S Pen, 200 MP camera, and titanium build.", colors: [C.black, C.silver], variants: [{ ram: "12 GB", storage: "256 GB", price: 129999 }], specifications: [{ label: "Display", value: '6.9" Dynamic AMOLED 2X, 120Hz' }, { label: "Processor", value: "Snapdragon 8 Elite for Galaxy" }, { label: "Camera", value: "200 MP + 50 MP + 10 MP + 12 MP" }, { label: "Battery", value: "5000 mAh, 45W" }, { label: "OS", value: "Android, One UI" }], featured: true, tags: ["5G", "Flagship", "S Pen", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+S25+Ultra"
  }),
  p({ id: "samsung-s25-fe", name: "Samsung Galaxy S25 FE", slug: "samsung-s25-fe", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-s25-fe", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A fan-edition flagship — core S25 experience at a friendlier price.", colors: [C.navy, C.black, C.white], variants: [{ ram: "8 GB", storage: "128 GB", price: 74999 }], specifications: [{ label: "Display", value: '6.7" Dynamic AMOLED 2X, 120Hz' }, { label: "Processor", value: "Exynos 2400e" }, { label: "Camera", value: "50 MP + 12 MP + 8 MP" }, { label: "Battery", value: "4400 mAh, 25W" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["5G", "Flagship", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+S25+FE"
  }),
  p({ id: "samsung-tab-s10-lite", name: "Samsung Galaxy Tab S10 Lite", slug: "samsung-tab-s10-lite", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-tab-s10-lite", image: "/images/products/samsung-tab-s10-lite/1.jpg", type: "tablet", category: "new-arrival", stock: "inStock", description: "A large-screen tablet with S Pen support — great for work and entertainment.", colors: [C.silver], variants: [{ ram: "6 GB", storage: "128 GB", price: 44999 }], specifications: [{ label: "Display", value: '12.4" Dynamic AMOLED' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "13 MP rear / 12 MP front" }, { label: "Battery", value: "10090 mAh" }, { label: "Connectivity", value: "Wi-Fi + SIM" }], featured: false, tags: ["Tablet", "S Pen", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+Tab+S10+Lite"
  }),
  p({ id: "samsung-m56", name: "Samsung Galaxy M56", slug: "samsung-m56", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-m56", image: "/images/products/samsung-m56/1.avif", type: "smartphone", category: "best-seller", stock: "inStock", description: "A big-battery M series phone with a smooth display and 5G.", colors: [C.black, C.green], variants: [{ ram: "8 GB", storage: "128 GB", price: 19999 }], specifications: [{ label: "Display", value: '6.7" Super AMOLED+, 120Hz' }, { label: "Processor", value: "Exynos" }, { label: "Camera", value: "50 MP + 5 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 45W" }, { label: "OS", value: "Android, One UI" }], featured: true, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+M56"
  }),
  p({ id: "samsung-m36", name: "Samsung Galaxy M36", slug: "samsung-m36", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-m36", image: "/images/products/samsung-m36/1.avif", type: "smartphone", category: "deal", stock: "inStock", description: "A value M series 5G phone with a dependable battery.", colors: [C.green, C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 14999 }, { ram: "8 GB", storage: "128 GB", price: 16999 }], specifications: [{ label: "Display", value: '6.7" Super AMOLED+, 90Hz' }, { label: "Processor", value: "Exynos" }, { label: "Camera", value: "50 MP + 2 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 25W" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+M36"
  }),
  p({ id: "samsung-m06", name: "Samsung Galaxy M06", slug: "samsung-m06", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-m06", type: "smartphone", category: "budget", stock: "inStock", description: "An entry M series 5G phone for everyday use.", colors: [C.green, C.black], variants: [{ ram: "4 GB", storage: "64 GB", price: 9999 }, { ram: "4 GB", storage: "128 GB", price: 11499 }, { ram: "6 GB", storage: "128 GB", price: 12999 }], specifications: [{ label: "Display", value: '6.7" PLS LCD' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "50 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 25W" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+M06"
  }),
  p({ id: "samsung-f70e", name: "Samsung Galaxy F70e", slug: "samsung-f70e", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-f70e", type: "smartphone", category: "deal", stock: "inStock", description: "A budget F series phone with a large battery.", colors: [C.green], variants: [{ ram: "4 GB", storage: "128 GB", price: 11999 }, { ram: "6 GB", storage: "128 GB", price: 13499 }], specifications: [{ label: "Display", value: '6.7" PLS LCD' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "50 MP + 2 MP" }, { label: "Battery", value: "6000 mAh" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+F70e"
  }),
  p({ id: "samsung-f36", name: "Samsung Galaxy F36", slug: "samsung-f36", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-f36", image: "/images/products/samsung-f36/1.avif", type: "smartphone", category: "deal", stock: "inStock", description: "A budget F series phone with an AMOLED display.", colors: [C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 13999 }], specifications: [{ label: "Display", value: '6.7" Super AMOLED, 90Hz' }, { label: "Processor", value: "Exynos" }, { label: "Camera", value: "50 MP + 2 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 25W" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["AMOLED", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+F36"
  }),
  p({ id: "samsung-f06", name: "Samsung Galaxy F06", slug: "samsung-f06", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-f06", image: "/images/products/samsung-f06/1.avif", type: "smartphone", category: "budget", stock: "inStock", description: "An entry F series 5G phone.", colors: [C.violet, C.blue], variants: [{ ram: "4 GB", storage: "128 GB", price: 10499 }, { ram: "6 GB", storage: "128 GB", price: 11999 }], specifications: [{ label: "Display", value: '6.7" PLS LCD, 90Hz' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "50 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 25W" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+F06"
  }),
  p({ id: "samsung-f07", name: "Samsung Galaxy F07", slug: "samsung-f07", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-f07", image: "/images/products/samsung-f07/1.avif", type: "smartphone", category: "budget", stock: "inStock", description: "A basic 4G F series phone for everyday use.", colors: [C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 8499 }], specifications: [{ label: "Display", value: '6.7" PLS LCD' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "13 MP + 2 MP" }, { label: "Battery", value: "5000 mAh" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+F07"
  }),
  p({ id: "samsung-a06", name: "Samsung Galaxy A06", slug: "samsung-a06", brand: "Samsung", brandSlug: "samsung", imageFolder: "samsung-a06", image: "/images/products/samsung-a06/1.avif", type: "smartphone", category: "budget", stock: "inStock", description: "A dependable budget A series phone.", colors: [C.black, C.grey], variants: [{ ram: "4 GB", storage: "64 GB", price: 9499 }], specifications: [{ label: "Display", value: '6.7" PLS LCD, 90Hz' }, { label: "Processor", value: "MediaTek Helio" }, { label: "Camera", value: "50 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 25W" }, { label: "OS", value: "Android, One UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Samsung+Galaxy+A06"
  }),

  // ════════════════ MOTOROLA ════════════════
  p({ id: "moto-edge-60", name: "Motorola Edge 60", slug: "moto-edge-60", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-edge-60", image: "/images/products/moto-edge-60/1.jpeg", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A premium Edge series phone with a curved pOLED display and clean software.", colors: [C.gibraltar], variants: [{ ram: "12 GB", storage: "256 GB", price: 27999 }], specifications: [{ label: "Display", value: '6.7" pOLED, 144Hz' }, { label: "Processor", value: "MediaTek Dimensity 8350" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "68W" }, { label: "OS", value: "Android, Stock" }], featured: true, tags: ["5G", "pOLED", "Stock Android", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Motorola+Edge+60"
  }),
  p({ id: "moto-70-fusion", name: "Motorola 70 Fusion", slug: "moto-70-fusion", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-70-fusion", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A stylish fusion of design and performance with a fast-refresh display.", colors: [C.blue, C.silver], variants: [{ ram: "8 GB", storage: "128 GB", price: 29999 }, { ram: "8 GB", storage: "256 GB", price: 31999 }], specifications: [{ label: "Display", value: '6.7" pOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 7 Gen series" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5500mAh" }, { label: "OS", value: "Android, Stock" }], featured: false, tags: ["5G", "pOLED", "Stock Android", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Motorola+70+Fusion"
  }),
  p({ id: "moto-60-fusion", name: "Motorola 60 Fusion", slug: "moto-60-fusion", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-60-fusion", image: "/images/products/moto-60-fusion/1.jpeg", type: "smartphone", category: "best-seller", stock: "inStock", description: "A popular mid-ranger with a curved pOLED display and clean Motorola software.", colors: [C.purple, C.blue, C.green, C.pink], variants: [{ ram: "8 GB", storage: "128 GB", price: 22999 }, { ram: "12 GB", storage: "256 GB", price: 27999 }], specifications: [{ label: "Display", value: '6.7" pOLED, 144Hz' }, { label: "Processor", value: "MediaTek Dimensity 7400" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "68W" }, { label: "OS", value: "Android, Stock" }], featured: true, tags: ["5G", "pOLED", "Stock Android", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Motorola+60+Fusion"
  }),
  p({ id: "moto-g96", name: "Motorola Moto G96", slug: "moto-g96", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-g96", image: "/images/products/moto-g96/1.jpeg", type: "smartphone", category: "new-arrival", stock: "limited", description: "A premium mid-ranger with a pOLED display, OIS camera, and clean software.", colors: [C.blue], variants: [{ ram: "8 GB", storage: "128 GB", price: 20999 }], specifications: [{ label: "Display", value: '6.7" pOLED, 144Hz' }, { label: "Processor", value: "Snapdragon 7s series" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5500mAh" }, { label: "OS", value: "Android, Stock" }], featured: true, tags: ["5G", "pOLED", "Stock Android", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Moto+G96"
  }),
  p({ id: "moto-g67-power", name: "Motorola Moto G67 Power", slug: "moto-g67-power", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-g67-power", image: "/images/products/moto-g67-power/1.jpeg", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A big-battery G series phone with a smooth display and reliable performance.", colors: [C.green, C.violet], variants: [{ ram: "8 GB", storage: "128 GB", price: 22999 }], specifications: [{ label: "Display", value: '6.78" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 7 series" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "45W" }, { label: "OS", value: "Android, Stock" }], featured: false, tags: ["5G", "6000mAh", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Moto+G67+Power"
  }),
  p({ id: "moto-g57-power", name: "Motorola Moto G57 Power", slug: "moto-g57-power", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-g57-power", image: "/images/products/moto-g57-power/1.jpeg", type: "smartphone", category: "best-seller", stock: "inStock", description: "Built to last — massive battery, clean Android, reliable 5G.", colors: [C.green, C.blue], variants: [{ ram: "8 GB", storage: "128 GB", price: 20999 }], specifications: [{ label: "Display", value: '6.78" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 6 series" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "6000mAh" }, { label: "OS", value: "Android, Stock" }], featured: true, tags: ["5G", "6000mAh", "Stock Android", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Moto+G57+Power"
  }),
  p({ id: "moto-g37-power", name: "Motorola Moto G37 Power", slug: "moto-g37-power", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-g37-power", image: "/images/products/moto-g37-power/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "A budget phone with a huge battery for all-day use.", colors: [C.black, C.green, C.blue], variants: [{ ram: "4 GB", storage: "128 GB", price: 15999 }, { ram: "8 GB", storage: "128 GB", price: 21999 }], specifications: [{ label: "Display", value: '6.72" FHD+ LCD, 120Hz' }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android, Stock" }], featured: false, tags: ["Budget", "6000mAh", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Moto+G37+Power"
  }),
  p({ id: "moto-g37", name: "Motorola Moto G37", slug: "moto-g37", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-g37", image: "/images/products/moto-g37/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "A budget G series phone for essential daily use.", colors: [C.black, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 14999 }], specifications: [{ label: "Display", value: '6.67" HD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 4 Gen series" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "5000mAh" }, { label: "OS", value: "Android, Stock" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Moto+G37"
  }),
  p({ id: "moto-g06-power", name: "Motorola Moto G06 Power", slug: "moto-g06-power", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-g06-power", type: "smartphone", category: "budget", stock: "inStock", description: "An entry G series power phone with a long-lasting battery.", colors: [C.grey, C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 12999 }], specifications: [{ label: "Display", value: '6.7" HD+ LCD, 90Hz' }, { label: "Processor", value: "MediaTek Helio G81" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "18W" }, { label: "OS", value: "Android, Stock" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Moto+G06+Power"
  }),
  p({ id: "moto-edge-60-pro", name: "Motorola Edge 60 Pro", slug: "moto-edge-60-pro", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-edge-60", type: "smartphone", category: "flagship", stock: "inStock", description: "The flagship Edge 60 Pro with a curved display, powerful chipset, and 90W charging.", colors: [C.grey], variants: [{ ram: "8 GB", storage: "256 GB", price: 29999 }], specifications: [{ label: "Display", value: '6.7" pOLED, 144Hz' }, { label: "Processor", value: "MediaTek Dimensity 8350 Extreme" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "90W" }, { label: "OS", value: "Android, Stock" }], featured: true, tags: ["5G", "Flagship", "Stock Android", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Motorola+Edge+60+Pro"
  }),
  p({ id: "moto-edge-70-pro", name: "Motorola Edge 70 Pro", slug: "moto-edge-70-pro", brand: "Motorola", brandSlug: "motorola", imageFolder: "moto-edge-70-pro", type: "smartphone", category: "flagship", stock: "inStock", description: "The ultimate Motorola flagship — Snapdragon 8 Elite, 200MP camera, curved pOLED display, and 125W TurboPower charging.", colors: [C.black, C.silver], variants: [{ ram: "12 GB", storage: "256 GB", price: 44999 }, { ram: "12 GB", storage: "512 GB", price: 49999 }], specifications: [{ label: "Display", value: '6.8" LTPO pOLED, 165Hz' }, { label: "Processor", value: "Snapdragon 8 Elite" }, { label: "Camera", value: "200MP OIS + 50MP Ultrawide + 12MP Telephoto" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "125W TurboPower + 50W Wireless" }, { label: "OS", value: "Android 15, Stock" }], featured: true, tags: ["5G", "Flagship", "Stock Android", "200MP", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Motorola+Edge+70+Pro"
  }),

  // ════════════════ APPLE ════════════════
  p({ id: "iphone-17", name: "iPhone 17", slug: "iphone-17", brand: "Apple", brandSlug: "apple", imageFolder: "iphone-17", type: "smartphone", category: "new-arrival", stock: "inStock", description: "The standard iPhone 17 with the A19 chip, Dynamic Island, and a stunning Super Retina XDR display.", colors: [C.black, C.white, C.blue, C.green], variants: [{ ram: "8 GB", storage: "128 GB", price: 79900 }, { ram: "8 GB", storage: "256 GB", price: 89900 }], specifications: [{ label: "Display", value: '6.3" Super Retina XDR OLED, 120Hz' }, { label: "Processor", value: "A19 Bionic" }, { label: "Camera", value: "48MP Fusion + 12MP Ultrawide" }, { label: "Battery", value: "All-day battery life" }, { label: "Charging", value: "USB-C, MagSafe" }, { label: "OS", value: "iOS 19" }], featured: true, tags: ["5G", "iOS", "MagSafe", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=iPhone+17"
  }),
  p({ id: "iphone-17-pro", name: "iPhone 17 Pro", slug: "iphone-17-pro", brand: "Apple", brandSlug: "apple", imageFolder: "iphone-17-pro", type: "smartphone", category: "flagship", stock: "inStock", description: "iPhone 17 Pro with the A19 Pro chip, ProMotion, and a pro-grade triple camera system with 5x optical zoom.", colors: [C.black, C.white, C.silver], variants: [{ ram: "8 GB", storage: "256 GB", price: 119900 }, { ram: "8 GB", storage: "512 GB", price: 139900 }, { ram: "8 GB", storage: "1 TB", price: 159900 }], specifications: [{ label: "Display", value: '6.3" Super Retina XDR OLED, 120Hz ProMotion, Always-On' }, { label: "Processor", value: "A19 Pro" }, { label: "Camera", value: "48MP Fusion + 12MP Ultrawide + 12MP 5x Telephoto" }, { label: "Battery", value: "All-day battery life" }, { label: "Charging", value: "USB-C, MagSafe" }, { label: "OS", value: "iOS 19" }], featured: true, tags: ["5G", "Flagship", "iOS", "ProMotion", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=iPhone+17+Pro"
  }),
  p({ id: "iphone-17-pro-max", name: "iPhone 17 Pro Max", slug: "iphone-17-pro-max", brand: "Apple", brandSlug: "apple", imageFolder: "iphone-17-pro-max", type: "smartphone", category: "flagship", stock: "limited", description: "The ultimate iPhone — A19 Pro chip, 6.9-inch ProMotion display, titanium build, and the best camera system ever on an iPhone.", colors: [C.black, C.white, C.silver], variants: [{ ram: "8 GB", storage: "256 GB", price: 144900 }, { ram: "8 GB", storage: "512 GB", price: 164900 }, { ram: "8 GB", storage: "1 TB", price: 184900 }], specifications: [{ label: "Display", value: '6.9" Super Retina XDR OLED, 120Hz ProMotion, Always-On' }, { label: "Processor", value: "A19 Pro" }, { label: "Camera", value: "48MP Fusion + 48MP Ultrawide + 12MP 5x Telephoto" }, { label: "Battery", value: "Longest battery life ever" }, { label: "Build", value: "Titanium" }, { label: "Charging", value: "USB-C, MagSafe" }, { label: "OS", value: "iOS 19" }], featured: true, tags: ["5G", "Flagship", "iOS", "ProMotion", "Titanium", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=iPhone+17+Pro+Max"
  }),
  p({ id: "iphone-17-air", name: "iPhone 17 Air", slug: "iphone-17-air", brand: "Apple", brandSlug: "apple", imageFolder: "iphone-17-air", type: "smartphone", category: "new-arrival", stock: "inStock", description: "The thinnest iPhone ever — ultra-slim design, A19 chip, and a stunning edge-to-edge display.", colors: [C.black, C.white], variants: [{ ram: "8 GB", storage: "256 GB", price: 99900 }, { ram: "8 GB", storage: "512 GB", price: 119900 }], specifications: [{ label: "Display", value: '6.6" Super Retina XDR OLED, 120Hz' }, { label: "Processor", value: "A19" }, { label: "Camera", value: "48MP Fusion + 12MP Ultrawide" }, { label: "Design", value: "5.5mm thin, Aerospace-grade aluminum" }, { label: "Charging", value: "USB-C, MagSafe" }, { label: "OS", value: "iOS 19" }], featured: true, tags: ["5G", "iOS", "Ultra-Slim", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=iPhone+17+Air"
  }),

  // ════════════════ ONEPLUS ════════════════
  p({ id: "oneplus-13", name: "OnePlus 13", slug: "oneplus-13", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-13", type: "smartphone", category: "flagship", stock: "inStock", description: "The OnePlus flagship — powerful cameras, flagship silicon, and ultra-fast charging.", colors: [C.blue], variants: [{ ram: "12 GB", storage: "256 GB", price: 63999 }], specifications: [{ label: "Display", value: '6.82" QHD+ AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 8 Elite" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "100W SuperVOOC" }, { label: "OS", value: "Android, OxygenOS" }], featured: true, tags: ["5G", "Flagship", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+13"
  }),
  p({ id: "oneplus-nord-6", name: "OnePlus Nord 6", slug: "oneplus-nord-6", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-nord-6", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A premium Nord with a fast display and flagship-grade feel.", colors: [C.mint], variants: [{ ram: "8 GB", storage: "256 GB", price: 44300 }, { ram: "12 GB", storage: "256 GB", price: 50485 }], specifications: [{ label: "Display", value: '6.74" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 7+ Gen 3" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "100W" }, { label: "OS", value: "Android, OxygenOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Nord+6"
  }),
  p({ id: "oneplus-nord-5", name: "OnePlus Nord 5", slug: "oneplus-nord-5", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-nord-5", type: "smartphone", category: "best-seller", stock: "inStock", description: "A popular Nord with a big battery and a smooth AMOLED.", colors: [C.dryice], variants: [{ ram: "8 GB", storage: "256 GB", price: 29999 }], specifications: [{ label: "Display", value: '6.83" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 8s Gen 3" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "6800mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, OxygenOS" }], featured: true, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Nord+5"
  }),
  p({ id: "oneplus-nord-ce6", name: "OnePlus Nord CE6", slug: "oneplus-nord-ce6", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-nord-ce6", type: "smartphone", category: "deal", stock: "inStock", description: "A value Nord CE with the core OnePlus experience.", colors: [C.black, C.blue], variants: [{ ram: "8 GB", storage: "128 GB", price: 34762 }, { ram: "8 GB", storage: "256 GB", price: 37872 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 7 Gen 3" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "100W" }, { label: "OS", value: "Android, OxygenOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Nord+CE6"
  }),
  p({ id: "oneplus-nord-ce6-lite", name: "OnePlus Nord CE6 Lite", slug: "oneplus-nord-ce6-lite", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-nord-ce6-lite", type: "smartphone", category: "budget", stock: "inStock", description: "The most affordable Nord CE — essential OnePlus at a budget price.", colors: [C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 25999 }], specifications: [{ label: "Display", value: '6.67" LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 695" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "5500mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, OxygenOS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Nord+CE6+Lite"
  }),
  p({ id: "oneplus-pad-go-2", name: "OnePlus Pad Go 2", slug: "oneplus-pad-go-2", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-pad-go-2", type: "tablet", category: "new-arrival", stock: "inStock", description: "A portable tablet with SIM + Wi-Fi — great for media and light work.", colors: [C.black], variants: [{ ram: "8 GB", storage: "256 GB", price: 31999 }], specifications: [{ label: "Display", value: '11.6" 2.4K' }, { label: "Processor", value: "Helio G100" }, { label: "Battery", value: "8000mAh" }, { label: "Features", value: "Dolby Atmos, SIM + Wi-Fi" }], featured: false, tags: ["Tablet", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Pad+Go+2"
  }),
  p({ id: "oneplus-z3", name: "OnePlus Buds Z3", slug: "oneplus-z3", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-z3", type: "earbuds", category: "accessory", stock: "inStock", description: "Comfortable TWS earbuds with ANC and long battery life.", colors: [C.black], variants: [{ ram: "", storage: "", price: 2999 }], specifications: [{ label: "Type", value: "True Wireless Earbuds" }, { label: "ANC", value: "Yes, 12.4mm drivers" }, { label: "Battery", value: "Up to 38 hours with case" }, { label: "Charging", value: "USB-C" }], featured: false, tags: ["Earbuds", "ANC"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Buds+Z3"
  }),
  p({ id: "oneplus-z2-anc", name: "OnePlus Buds Z2 ANC", slug: "oneplus-z2-anc", brand: "OnePlus", brandSlug: "oneplus", imageFolder: "oneplus-z2-anc", type: "earbuds", category: "accessory", stock: "inStock", description: "TWS earbuds with active noise cancellation and rich bass.", colors: [C.black], variants: [{ ram: "", storage: "", price: 3499 }], specifications: [{ label: "Type", value: "True Wireless Earbuds" }, { label: "ANC", value: "40dB ANC, Dolby Atmos" }, { label: "Battery", value: "Up to 38 hours with case" }, { label: "Charging", value: "USB-C" }], featured: false, tags: ["Earbuds", "ANC"],
    flipkartUrl: "https://www.flipkart.com/search?q=OnePlus+Buds+Z2+ANC"
  }),

  // ════════════════ OPPO ════════════════
  p({ id: "oppo-reno-15-pro-mini", name: "Oppo Reno 15 Pro Mini", slug: "oppo-reno-15-pro-mini", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-reno-15-pro-mini", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A compact flagship — pocketable size, premium cameras, and a bright display.", colors: [C.white, C.brown, C.pink], variants: [{ ram: "12 GB", storage: "256 GB", price: 59999 }, { ram: "12 GB", storage: "512 GB", price: 64999 }], specifications: [{ label: "Display", value: '6.3" AMOLED, 120Hz' }, { label: "Processor", value: "MediaTek Dimensity 9500" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "80W wired, 50W wireless" }, { label: "OS", value: "Android, ColorOS" }], featured: true, tags: ["5G", "Flagship", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+Reno+15+Pro+Mini"
  }),
  p({ id: "oppo-reno-15", name: "Oppo Reno 15", slug: "oppo-reno-15", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-reno-15", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A stylish mid-premium Reno with a capable camera and fast charging.", colors: [C.blue], variants: [{ ram: "8 GB", storage: "256 GB", price: 47999 }], specifications: [{ label: "Display", value: '6.59" AMOLED, 120Hz' }, { label: "Processor", value: "Dimensity 9400e" }, { label: "Camera", value: "50MP Dual Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+Reno+15"
  }),
  p({ id: "oppo-reno-15c", name: "Oppo Reno 15C", slug: "oppo-reno-15c", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-reno-15c", type: "smartphone", category: "deal", stock: "inStock", description: "A value Reno with the signature design at a friendlier price.", colors: [C.pink], variants: [{ ram: "8 GB", storage: "256 GB", price: 41999 }], specifications: [{ label: "Display", value: '6.67" AMOLED' }, { label: "Processor", value: "Snapdragon 7 series" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "5600mAh" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+Reno+15C"
  }),
  p({ id: "oppo-k14", name: "Oppo K14", slug: "oppo-k14", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-k14", image: "/images/products/oppo-k14/1.jpeg", type: "smartphone", category: "best-seller", stock: "inStock", description: "A performance-focused K series phone with fast charging.", colors: [C.violet, C.blue, C.white], variants: [{ ram: "6 GB", storage: "128 GB", price: 19999 }, { ram: "6 GB", storage: "256 GB", price: 21999 }, { ram: "8 GB", storage: "256 GB", price: 23999 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 7 Gen series" }, { label: "Camera", value: "50MP Dual Camera" }, { label: "Battery", value: "7000mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, ColorOS" }], featured: true, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+K14"
  }),
  p({ id: "oppo-k14x", name: "Oppo K14x", slug: "oppo-k14x", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-k14x", type: "smartphone", category: "deal", stock: "inStock", description: "A budget-friendly K series phone with Oppo's camera expertise.", colors: [C.violet, C.blue], variants: [{ ram: "6 GB", storage: "128 GB", price: 13999 }, { ram: "8 GB", storage: "128 GB", price: 15999 }], specifications: [{ label: "Display", value: '6.67" LCD, 120Hz' }, { label: "Processor", value: "Dimensity 6300" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "45W" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+K14x"
  }),
  p({ id: "oppo-k13", name: "Oppo K13", slug: "oppo-k13", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-k13", type: "smartphone", category: "deal", stock: "inStock", description: "A budget K series phone with a large battery and smooth display.", colors: [C.purple], variants: [{ ram: "8 GB", storage: "256 GB", price: 24999 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 120Hz' }, { label: "Processor", value: "Snapdragon 6 Gen 4" }, { label: "Battery", value: "7000mAh" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+K13"
  }),
  p({ id: "oppo-k13x", name: "Oppo K13x", slug: "oppo-k13x", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-k13x", type: "smartphone", category: "deal", stock: "inStock", description: "An affordable K series phone with a large battery and smooth display.", colors: [C.violet], variants: [{ ram: "8 GB", storage: "128 GB", price: 18999 }], specifications: [{ label: "Display", value: '6.67" LCD, 120Hz' }, { label: "Processor", value: "Dimensity 6300" }, { label: "Battery", value: "6000mAh" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+K13x"
  }),
  p({ id: "oppo-f33-pro", name: "Oppo F33 Pro", slug: "oppo-f33-pro", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-f33-pro", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A camera-focused F series phone with a bold red design.", colors: [C.red], variants: [{ ram: "8 GB", storage: "128 GB", price: 37999 }], specifications: [{ label: "Camera", value: "50MP OIS" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "Camera", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+F33+Pro"
  }),
  p({ id: "oppo-f33", name: "Oppo F33", slug: "oppo-f33", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-f33", type: "smartphone", category: "deal", stock: "inStock", description: "A budget F series phone with a capable camera.", colors: [C.green], variants: [{ ram: "8 GB", storage: "128 GB", price: 36999 }], specifications: [{ label: "Camera", value: "50MP" }, { label: "Battery", value: "5600mAh" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+F33"
  }),
  p({ id: "oppo-f31-pro-plus", name: "Oppo F31 Pro Plus", slug: "oppo-f31-pro-plus", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-f31-pro-plus", type: "smartphone", category: "deal", stock: "inStock", description: "A premium F series phone with a striking blue finish.", colors: [C.blue], variants: [{ ram: "8 GB", storage: "256 GB", price: 32999 }], specifications: [{ label: "Display", value: "AMOLED, 120Hz" }, { label: "Camera", value: "50MP Triple Camera" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+F31+Pro+Plus"
  }),
  p({ id: "oppo-a6x", name: "Oppo A6x", slug: "oppo-a6x", brand: "Oppo", brandSlug: "oppo", imageFolder: "oppo-a6x", type: "smartphone", category: "budget", stock: "inStock", description: "A budget A series phone for everyday essentials.", colors: [C.blue, C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 16999 }, { ram: "4 GB", storage: "128 GB", price: 18999 }], specifications: [{ label: "Display", value: '6.67" HD+' }, { label: "Battery", value: "5100mAh" }, { label: "OS", value: "Android, ColorOS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Oppo+A6x"
  }),

  // ════════════════ REALME ════════════════
  p({ id: "realme-16-pro-plus", name: "Realme 16 Pro+", slug: "realme-16-pro-plus", brand: "Realme", brandSlug: "realme", imageFolder: "realme-16-pro-plus", type: "smartphone", category: "flagship", stock: "inStock", description: "The top-tier Realme 16 with a pro-grade camera and flagship design.", colors: [C.gold], variants: [{ ram: "8 GB", storage: "128 GB", price: 46999 }], specifications: [{ label: "Camera", value: "50MP Triple Camera" }, { label: "Charging", value: "100W" }, { label: "OS", value: "Android, realme UI" }], featured: true, tags: ["5G", "Flagship", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+16+Pro+Plus"
  }),
  p({ id: "realme-16-pro", name: "Realme 16 Pro", slug: "realme-16-pro", brand: "Realme", brandSlug: "realme", imageFolder: "realme-16-pro", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A premium Realme 16 with a refined design and fast charging.", colors: [C.gold, C.grey], variants: [{ ram: "8 GB", storage: "128 GB", price: 36999 }, { ram: "8 GB", storage: "256 GB", price: 39999 }], specifications: [{ label: "Display", value: "AMOLED 120Hz" }, { label: "Camera", value: "50MP OIS" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+16+Pro"
  }),
  p({ id: "realme-16", name: "Realme 16", slug: "realme-16", brand: "Realme", brandSlug: "realme", imageFolder: "realme-16", type: "smartphone", category: "best-seller", stock: "inStock", description: "A balanced mid-ranger with a great display and reliable battery.", colors: [C.black, C.white], variants: [{ ram: "8 GB", storage: "128 GB", price: 33999 }, { ram: "8 GB", storage: "256 GB", price: 36999 }], specifications: [{ label: "Display", value: "AMOLED 120Hz" }, { label: "Camera", value: "50MP OIS" }, { label: "Charging", value: "80W" }, { label: "OS", value: "Android, realme UI" }], featured: true, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+16"
  }),
  p({ id: "realme-16t", name: "Realme 16T", slug: "realme-16t", brand: "Realme", brandSlug: "realme", imageFolder: "realme-16t", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A performance-tuned Realme 16 with a fast display.", colors: [C.green, C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 29999 }, { ram: "8 GB", storage: "128 GB", price: 31999 }, { ram: "8 GB", storage: "256 GB", price: 34999 }], specifications: [{ label: "Display", value: "AMOLED 120Hz" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "45W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+16T"
  }),
  p({ id: "realme-15t", name: "Realme 15T", slug: "realme-15t", brand: "Realme", brandSlug: "realme", imageFolder: "realme-15t", type: "smartphone", category: "deal", stock: "inStock", description: "A value Realme 15 with a dependable battery and display.", colors: [C.grey, C.silver], variants: [{ ram: "8 GB", storage: "128 GB", price: 27999 }, { ram: "8 GB", storage: "256 GB", price: 33999 }, { ram: "12 GB", storage: "256 GB", price: 35999 }], specifications: [{ label: "Battery", value: "5500 mAh, 67W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+15T"
  }),
  p({ id: "realme-15x", name: "Realme 15x", slug: "realme-15x", brand: "Realme", brandSlug: "realme", imageFolder: "realme-15x", type: "smartphone", category: "deal", stock: "inStock", description: "A budget 5G Realme with a big battery.", colors: [C.blue, C.red], variants: [{ ram: "6 GB", storage: "128 GB", price: 23999 }, { ram: "8 GB", storage: "128 GB", price: 25999 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+15x"
  }),
  p({ id: "realme-15", name: "Realme 15", slug: "realme-15", brand: "Realme", brandSlug: "realme", imageFolder: "realme-15", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Realme 15 with a solid battery and camera.", colors: [C.green, C.silver], variants: [{ ram: "8 GB", storage: "256 GB", price: 31999 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+15"
  }),
  p({ id: "realme-c83", name: "Realme C83", slug: "realme-c83", brand: "Realme", brandSlug: "realme", imageFolder: "realme-c83", type: "smartphone", category: "budget", stock: "inStock", description: "A budget C series phone for everyday essentials.", colors: [C.purple, C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 16400 }, { ram: "4 GB", storage: "128 GB", price: 18499 }, { ram: "6 GB", storage: "128 GB", price: 20499 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+C83"
  }),
  p({ id: "realme-c71", name: "Realme C71", slug: "realme-c71", brand: "Realme", brandSlug: "realme", imageFolder: "realme-c71", type: "smartphone", category: "budget", stock: "inStock", description: "A basic 4G C series phone for essential use.", colors: [C.black], variants: [{ ram: "4 GB", storage: "64 GB", price: 13999 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+C71"
  }),
  p({ id: "realme-p4x", name: "Realme P4x", slug: "realme-p4x", brand: "Realme", brandSlug: "realme", imageFolder: "realme-p4x", type: "smartphone", category: "deal", stock: "inStock", description: "A durable budget 5G P series phone with a big battery.", colors: [C.green, C.silver, C.pink], variants: [{ ram: "6 GB", storage: "128 GB", price: 21999 }, { ram: "8 GB", storage: "128 GB", price: 23499 }, { ram: "8 GB", storage: "256 GB", price: 25499 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "6000mAh", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+P4x"
  }),
  p({ id: "realme-p4", name: "Realme P4", slug: "realme-p4", brand: "Realme", brandSlug: "realme", imageFolder: "realme-p4", type: "smartphone", category: "deal", stock: "inStock", description: "A mid-budget 5G P series phone.", colors: [C.grey], variants: [{ ram: "6 GB", storage: "128 GB", price: 24499 }, { ram: "8 GB", storage: "128 GB", price: 25999 }, { ram: "8 GB", storage: "256 GB", price: 27999 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+P4"
  }),
  p({ id: "realme-p4-lite", name: "Realme P4 Lite", slug: "realme-p4-lite", brand: "Realme", brandSlug: "realme", imageFolder: "realme-p4-lite", type: "smartphone", category: "budget", stock: "inStock", description: "The most affordable P series — budget 5G and 4G variants.", colors: [C.gold, C.blue, C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 11499 }, { ram: "4 GB", storage: "128 GB", price: 13499 }, { ram: "4 GB", storage: "64 GB", price: 14499 }, { ram: "4 GB", storage: "128 GB", price: 16499 }, { ram: "6 GB", storage: "128 GB", price: 19499 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+P4+Lite"
  }),
  p({ id: "realme-p4-power", name: "Realme P4 Power", slug: "realme-p4-power", brand: "Realme", brandSlug: "realme", imageFolder: "realme-p4-power", type: "smartphone", category: "budget", stock: "inStock", description: "A big-battery budget P series phone.", colors: [C.silver], variants: [{ ram: "8 GB", storage: "128 GB", price: 29499 }], specifications: [{ label: "Battery", value: "7000mAh" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "6000mAh", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+P4+Power"
  }),
  p({ id: "realme-p3x", name: "Realme P3x", slug: "realme-p3x", brand: "Realme", brandSlug: "realme", imageFolder: "realme-p3x", type: "smartphone", category: "budget", stock: "inStock", description: "A budget 5G P series phone with a big battery.", colors: [C.blue], variants: [{ ram: "6 GB", storage: "128 GB", price: 16999 }], specifications: [{ label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "6000mAh", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+P3x"
  }),
  p({ id: "realme-pad-2-lite", name: "Realme Pad 2 Lite", slug: "realme-pad-2-lite", brand: "Realme", brandSlug: "realme", imageFolder: "realme-pad-2-lite", type: "tablet", category: "deal", stock: "inStock", description: "A budget tablet with SIM + Wi-Fi for media and browsing.", colors: [C.grey], variants: [{ ram: "8 GB", storage: "128 GB", price: 18999 }], specifications: [{ label: "Display", value: '11" LCD' }, { label: "Battery", value: "8300mAh" }, { label: "Connectivity", value: "Wi-Fi + SIM" }], featured: false, tags: ["Tablet", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Pad+2+Lite"
  }),

  // ════════════════ REDMI ════════════════
  p({ id: "redmi-a7-pro", name: "Redmi A7 Pro", slug: "redmi-a7-pro", brand: "Redmi", brandSlug: "redmi", imageFolder: "redmi-a7-pro", type: "smartphone", category: "budget", stock: "inStock", description: "A performance Redmi A series phone with AI-enhanced camera.", colors: [C.orange, C.blue, C.black], variants: [{ ram: "4 GB", storage: "64 GB", price: 12999 }, { ram: "4 GB", storage: "128 GB", price: 13999 }], specifications: [{ label: "Display", value: '6.7" HD+ LCD' }, { label: "Processor", value: "Helio G99" }, { label: "Camera", value: "50MP AI Dual Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=Redmi+A7+Pro"
  }),
  p({ id: "redmi-a5", name: "Redmi A5", slug: "redmi-a5", brand: "Redmi", brandSlug: "redmi", imageFolder: "redmi-a5", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Redmi A series phone with a large display.", colors: [C.gold, C.black, C.blue], variants: [{ ram: "3 GB", storage: "64 GB", price: 10990 }], specifications: [{ label: "Display", value: '6.88" HD+ LCD, 120Hz' }, { label: "Processor", value: "Unisoc T7250" }, { label: "Camera", value: "32MP Rear" }, { label: "Battery", value: "5200mAh" }, { label: "Charging", value: "15W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=Redmi+A5"
  }),
  p({ id: "redmi-a4", name: "Redmi A4", slug: "redmi-a4", brand: "Redmi", brandSlug: "redmi", imageFolder: "redmi-a4", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Redmi A series phone with essentials.", colors: [C.purple, C.black], variants: [{ ram: "4 GB", storage: "128 GB", price: 10319 }], specifications: [{ label: "Display", value: '6.88" HD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 4s Gen 2" }, { label: "Camera", value: "50MP Rear" }, { label: "Battery", value: "5160mAh" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=Redmi+A4"
  }),
  p({ id: "redmi-15c", name: "Redmi 15C", slug: "redmi-15c", brand: "Redmi", brandSlug: "redmi", imageFolder: "redmi-15c", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Redmi C series phone with a smooth display.", colors: [C.blue], variants: [{ ram: "4 GB", storage: "128 GB", price: 16999 }], specifications: [{ label: "Display", value: '6.9" LCD, 120Hz' }, { label: "Processor", value: "Helio G81" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=Redmi+15C"
  }),
  p({ id: "redmi-15a", name: "Redmi 15A", slug: "redmi-15a", brand: "Redmi", brandSlug: "redmi", imageFolder: "redmi-15a", type: "smartphone", category: "budget", stock: "inStock", description: "An entry-level Redmi for basic use.", colors: [C.blue, C.black, C.purple], variants: [{ ram: "4 GB", storage: "64 GB", price: 14859 }, { ram: "4 GB", storage: "128 GB", price: 15724 }, { ram: "6 GB", storage: "128 GB", price: 17499 }], specifications: [{ label: "Display", value: '6.88" HD+ LCD' }, { label: "Processor", value: "Helio G81" }, { label: "Camera", value: "32MP" }, { label: "Battery", value: "5200mAh" }, { label: "Charging", value: "15W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    amazonUrl: "https://www.amazon.in/s?k=Redmi+15A"
  }),

  // ════════════════ POCO ════════════════
  p({ id: "poco-m7-plus", name: "POCO M7 Plus", slug: "poco-m7-plus", brand: "POCO", brandSlug: "poco", imageFolder: "poco-m7-plus", image: "/images/products/poco-m7-plus/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "A premium POCO with a flagship-grade chipset and fast charging.", colors: [C.black, C.blue], variants: [{ ram: "4 GB", storage: "128 GB", price: 15499 }, { ram: "6 GB", storage: "128 GB", price: 16999 }], specifications: [{ label: "Display", value: '6.78" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Dimensity 7300" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "45W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Poco+M7+Plus"
  }),
  p({ id: "poco-m7", name: "POCO M7", slug: "poco-m7", brand: "POCO", brandSlug: "poco", imageFolder: "poco-m7", type: "smartphone", category: "budget", stock: "inStock", description: "A powerful POCO with a large battery and high-refresh display.", colors: [C.blue, C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 12499 }, { ram: "8 GB", storage: "128 GB", price: 13499 }], specifications: [{ label: "Display", value: '6.72" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 6 Gen Series" }, { label: "Camera", value: "50MP AI Camera" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Poco+M7"
  }),
  p({ id: "poco-c85x", name: "POCO C85x", slug: "poco-c85x", brand: "POCO", brandSlug: "poco", imageFolder: "poco-c85x", image: "/images/products/poco-c85x/1.avif", type: "smartphone", category: "budget", stock: "inStock", description: "An entry POCO C series phone with a big display.", colors: [C.black, C.gold, C.green], variants: [{ ram: "4 GB", storage: "64 GB", price: 12499 }, { ram: "4 GB", storage: "128 GB", price: 13499 }], specifications: [{ label: "Display", value: '6.88" HD+ LCD, 120Hz' }, { label: "Processor", value: "Snapdragon 4s Gen 2" }, { label: "Camera", value: "50MP AI Camera" }, { label: "Battery", value: "5160mAh" }, { label: "Charging", value: "18W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Poco+C85x"
  }),
  p({ id: "poco-c85", name: "POCO C85", slug: "poco-c85", brand: "POCO", brandSlug: "poco", imageFolder: "poco-c85", type: "smartphone", category: "budget", stock: "inStock", description: "A basic budget POCO C series phone.", colors: [C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 15999 }], specifications: [{ label: "Display", value: '6.74" HD+ LCD, 90Hz' }, { label: "Processor", value: "Helio G85" }, { label: "Camera", value: "50MP Dual Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "18W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Poco+C85"
  }),
  p({ id: "poco-c71", name: "POCO C71", slug: "poco-c71", brand: "POCO", brandSlug: "poco", imageFolder: "poco-c71", type: "smartphone", category: "budget", stock: "inStock", description: "An entry-level POCO C series phone.", colors: [C.black, C.gold], variants: [{ ram: "4 GB", storage: "64 GB", price: 8999 }, { ram: "6 GB", storage: "128 GB", price: 9999 }], specifications: [{ label: "Display", value: '6.88" HD+ LCD, 120Hz' }, { label: "Processor", value: "Unisoc T7250" }, { label: "Camera", value: "32MP AI Camera" }, { label: "Battery", value: "5200mAh" }, { label: "Charging", value: "15W" }, { label: "OS", value: "Android, HyperOS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Poco+C71"
  }),

  // ════════════════ NARZO ════════════════
  p({ id: "narzo-100-lite", name: "Realme Narzo 100 Lite", slug: "narzo-100-lite", brand: "Narzo", brandSlug: "narzo", imageFolder: "narzo-100-lite", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Narzo phone with a smooth display.", colors: [C.black, C.silver], variants: [{ ram: "4 GB", storage: "64 GB", price: 14783 }, { ram: "4 GB", storage: "128 GB", price: 15890 }, { ram: "6 GB", storage: "128 GB", price: 18377 }], specifications: [{ label: "Display", value: '6.74" HD+ 90Hz' }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "18W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Narzo+100+Lite"
  }),
  p({ id: "narzo-80-lite", name: "Realme Narzo 80 Lite", slug: "narzo-80-lite", brand: "Narzo", brandSlug: "narzo", imageFolder: "narzo-80-lite", type: "smartphone", category: "budget", stock: "inStock", description: "A stylish Narzo with a high-refresh display and reliable 4G performance.", colors: [C.gold], variants: [{ ram: "6 GB", storage: "128 GB", price: 10999 }], specifications: [{ label: "Display", value: '6.72" FHD+ 120Hz' }, { label: "Processor", value: "Helio G99" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Narzo+80+Lite"
  }),
  p({ id: "narzo-90x", name: "Realme Narzo 90x", slug: "narzo-90x", brand: "Narzo", brandSlug: "narzo", imageFolder: "narzo-90x", type: "smartphone", category: "deal", stock: "inStock", description: "A value 5G Narzo with a big battery.", colors: [C.blue], variants: [{ ram: "6 GB", storage: "128 GB", price: 18799 }, { ram: "8 GB", storage: "128 GB", price: 19990 }], specifications: [{ label: "Display", value: '6.72" FHD+ 120Hz' }, { label: "Processor", value: "Dimensity 6100+" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "45W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Narzo+90x"
  }),
  p({ id: "narzo-90", name: "Realme Narzo 90", slug: "narzo-90", brand: "Narzo", brandSlug: "narzo", imageFolder: "narzo-90", type: "smartphone", category: "budget", stock: "inStock", description: "A premium Narzo with an AMOLED display and powerful chipset.", colors: [C.gold], variants: [{ ram: "8 GB", storage: "128 GB", price: 19999 }], specifications: [{ label: "Display", value: '6.67" AMOLED 120Hz' }, { label: "Processor", value: "Dimensity 7300" }, { label: "Camera", value: "50MP OIS" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "67W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Narzo+90"
  }),
  p({ id: "narzo-n53", name: "Realme Narzo N53", slug: "narzo-n53", brand: "Narzo", brandSlug: "narzo", imageFolder: "narzo-n53", image: "/images/products/narzo-n53/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "An ultra-slim budget Narzo with a big battery.", colors: [C.gold, C.black], variants: [{ ram: "4 GB", storage: "64 GB", price: 8498 }, { ram: "6 GB", storage: "128 GB", price: 9887 }], specifications: [{ label: "Display", value: '6.74" HD+ 90Hz' }, { label: "Processor", value: "Unisoc T612" }, { label: "Camera", value: "50MP AI Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Narzo+N53"
  }),
  p({ id: "narzo-power", name: "Realme Narzo Power", slug: "narzo-power", brand: "Narzo", brandSlug: "narzo", imageFolder: "narzo-power", type: "smartphone", category: "budget", stock: "inStock", description: "A big-battery premium Narzo with a powerful chipset.", colors: [C.silver], variants: [{ ram: "8 GB", storage: "128 GB", price: 27945 }], specifications: [{ label: "Display", value: '6.72" FHD+ 120Hz' }, { label: "Processor", value: "Snapdragon 6 Gen Series" }, { label: "Camera", value: "50MP" }, { label: "Battery", value: "6000mAh" }, { label: "Charging", value: "45W" }, { label: "OS", value: "Android, realme UI" }], featured: false, tags: ["5G", "6000mAh", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Realme+Narzo+Power"
  }),

  // ════════════════ GOOGLE ════════════════
  p({ id: "pixel-10a", name: "Google Pixel 10a", slug: "pixel-10a", brand: "Google", brandSlug: "google", imageFolder: "pixel-10a", image: "/images/products/pixel-10a/1.jpg", type: "smartphone", category: "new-arrival", stock: "inStock", description: "Google's A-series Pixel — the best of Android AI at an accessible price.", colors: [C.black, C.red, C.white, C.blue], variants: [{ ram: "8 GB", storage: "256 GB", price: 49999 }], specifications: [{ label: "Display", value: '6.1" OLED, 120Hz' }, { label: "Processor", value: "Google Tensor G5" }, { label: "Camera", value: "48 MP + 13 MP" }, { label: "Battery", value: "4500 mAh" }, { label: "OS", value: "Android, Pixel" }], featured: true, tags: ["5G", "AI Camera", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Google+Pixel+10a"
  }),
  p({ id: "pixel-10", name: "Google Pixel 10", slug: "pixel-10", brand: "Google", brandSlug: "google", imageFolder: "pixel-10", image: "/images/products/pixel-10/1.jpg", type: "smartphone", category: "flagship", stock: "limited", description: "The flagship Pixel 10 with Google's most advanced AI photography.", colors: [C.indigo, C.black, C.frost], variants: [{ ram: "12 GB", storage: "256 GB", price: 79999 }], specifications: [{ label: "Display", value: '6.3" LTPO OLED, 120Hz' }, { label: "Processor", value: "Google Tensor G5" }, { label: "Camera", value: "50 MP + 48 MP + 48 MP" }, { label: "Battery", value: "4900 mAh" }, { label: "OS", value: "Android, Pixel" }], featured: true, tags: ["5G", "Flagship", "AI Camera", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Google+Pixel+10"
  }),

  // ════════════════ APPLE ════════════════
  p({ id: "airpods-4", name: "Apple AirPods 4", slug: "airpods-4", brand: "Apple", brandSlug: "apple", imageFolder: "airpods-4", image: "/images/products/airpods-4/1.jpeg", type: "earbuds", category: "accessory", stock: "inStock", description: "Apple AirPods 4 with a redesigned comfortable fit and improved audio.", colors: [C.white], variants: [], specifications: [{ label: "Type", value: "True Wireless Earbuds" }, { label: "ANC", value: "Optional (ANC variant)" }, { label: "Chip", value: "Apple H2" }, { label: "Charging", value: "USB-C / MagSafe" }], featured: true, tags: ["Earbuds", "Apple"], priceOnEnquiry: true,
    flipkartUrl: "https://www.flipkart.com/search?q=AirPods+4"
  }),


  // ════════════════ INFINIX ════════════════
  p({ id: "infinix-gt-30-pro", name: "Infinix GT 30 Pro", slug: "infinix-gt-30-pro", brand: "Infinix", brandSlug: "infinix", imageFolder: "infinix-gt-30-pro", type: "smartphone", category: "new-arrival", stock: "inStock", description: "A gaming-focused Infinix GT with a fast display and gaming triggers.", colors: [C.black, C.white], variants: [{ ram: "8 GB", storage: "256 GB", price: 22999 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 144Hz' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "108 MP + 2 MP" }, { label: "Battery", value: "5500 mAh, 45W" }, { label: "OS", value: "Android, XOS" }], featured: false, tags: ["5G", "Gaming", "144Hz", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Infinix+GT+30+Pro"
  }),
  p({ id: "infinix-gt-30", name: "Infinix GT 30", slug: "infinix-gt-30", brand: "Infinix", brandSlug: "infinix", imageFolder: "infinix-gt-30", image: "/images/products/infinix-gt-30/1.jpeg", type: "smartphone", category: "deal", stock: "inStock", description: "A gaming-tuned Infinix GT at a budget price.", colors: [C.green], variants: [{ ram: "8 GB", storage: "256 GB", price: 18999 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 144Hz' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "108 MP + 2 MP" }, { label: "Battery", value: "5500 mAh, 45W" }, { label: "OS", value: "Android, XOS" }], featured: false, tags: ["5G", "Gaming", "Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Infinix+GT+30"
  }),
  p({ id: "infinix-note-edge", name: "Infinix Note Edge", slug: "infinix-note-edge", brand: "Infinix", brandSlug: "infinix", imageFolder: "infinix-note-edge", type: "smartphone", category: "deal", stock: "inStock", description: "An edge-display Note series phone with a big battery.", colors: [C.green], variants: [{ ram: "8 GB", storage: "128 GB", price: 14999 }, { ram: "8 GB", storage: "256 GB", price: 16999 }], specifications: [{ label: "Display", value: '6.8" AMOLED, 120Hz' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "108 MP + 2 MP + 2 MP" }, { label: "Battery", value: "5500 mAh, 45W" }, { label: "OS", value: "Android, XOS" }], featured: false, tags: ["5G", "AMOLED", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Infinix+Note+Edge"
  }),
  p({ id: "infinix-smart-20", name: "Infinix Smart 20", slug: "infinix-smart-20", brand: "Infinix", brandSlug: "infinix", imageFolder: "infinix-smart-20", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Smart series phone for essentials.", colors: [C.black, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 6999 }], specifications: [{ label: "Display", value: '6.7" LCD' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "13 MP" }, { label: "Battery", value: "5000 mAh" }, { label: "OS", value: "Android, XOS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Infinix+Smart+20"
  }),
  p({ id: "infinix-smart-10", name: "Infinix Smart 10", slug: "infinix-smart-10", brand: "Infinix", brandSlug: "infinix", imageFolder: "infinix-smart-10", image: "/images/products/infinix-smart-10/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "An entry Infinix Smart series phone.", colors: [C.gold, C.blue, C.black], variants: [{ ram: "4 GB", storage: "64 GB", price: 6499 }], specifications: [{ label: "Display", value: '6.7" LCD' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "13 MP" }, { label: "Battery", value: "5000 mAh" }, { label: "OS", value: "Android, XOS" }], featured: false, tags: ["Budget", "EMI Available"],
    flipkartUrl: "https://www.flipkart.com/search?q=Infinix+Smart+10"
  }),
  p({ id: "infinix-gaming-kit", name: "Infinix Gaming Kit", slug: "infinix-gaming-kit", brand: "Infinix", brandSlug: "infinix", imageFolder: "infinix-gaming-kit", type: "accessory", category: "accessory", stock: "inStock", description: "An accessories kit for Infinix GT gaming phones.", colors: [C.black], variants: [], specifications: [{ label: "Type", value: "Gaming Accessory Kit" }, { label: "Includes", value: "Cooling fan, triggers, case" }], featured: false, tags: ["Accessory", "Gaming"], priceOnEnquiry: true }),

  // ════════════════ CMF (by Nothing) ════════════════
  p({ id: "cmf-4a", name: "CMF Phone 4A", slug: "cmf-4a", brand: "CMF", brandSlug: "cmf", imageFolder: "cmf-4a", type: "smartphone", category: "budget", stock: "inStock", description: "CMF by Nothing — a clean Android budget phone with a swappable back.", colors: [C.black, C.white], variants: [{ ram: "8 GB", storage: "256 GB", price: 15999 }, { ram: "12 GB", storage: "256 GB", price: 17999 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 120Hz' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "50 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 33W" }, { label: "OS", value: "Android, Nothing OS" }], featured: false, tags: ["5G", "AMOLED", "Budget", "EMI Available"], image: "/images/products/cmf-4a/1.webp" }),
  p({ id: "cmf-3a-lite", name: "CMF Phone 3A Lite", slug: "cmf-3a-lite", brand: "CMF", brandSlug: "cmf", imageFolder: "cmf-3a-lite", type: "smartphone", category: "budget", stock: "inStock", description: "An entry CMF phone with Nothing's signature clean design.", colors: [C.black, C.white], variants: [{ ram: "8 GB", storage: "128 GB", price: 12999 }, { ram: "8 GB", storage: "256 GB", price: 13999 }], specifications: [{ label: "Display", value: '6.7" AMOLED, 120Hz' }, { label: "Processor", value: "MediaTek Dimensity" }, { label: "Camera", value: "50 MP + 2 MP" }, { label: "Battery", value: "5000 mAh, 33W" }, { label: "OS", value: "Android, Nothing OS" }], featured: false, tags: ["5G", "Budget", "EMI Available"], image: "/images/products/cmf-3a-lite/1.webp" }),

  // ════════════════ JIO (feature phones) ════════════════
  p({ id: "jio-v4", name: "Jio Bharat V4", slug: "jio-v4", brand: "Jio", brandSlug: "jio", imageFolder: "jio-v4", type: "feature-phone", category: "budget", stock: "inStock", description: "An affordable Jio Bharat feature phone with 4G and Jio apps.", colors: [C.black, C.blue], variants: [{ ram: "", storage: "", price: 1299 }], specifications: [{ label: "Display", value: "2.4-inch" }, { label: "Battery", value: "2000mAh" }, { label: "Features", value: "VoLTE, Jio Apps, FM Radio" }], featured: false, tags: ["Feature Phone", "4G"] }),
  p({ id: "jio-v3", name: "Jio Bharat V3", slug: "jio-v3", brand: "Jio", brandSlug: "jio", imageFolder: "jio-v3", type: "feature-phone", category: "budget", stock: "inStock", description: "A budget Jio Bharat feature phone with 4G and Jio apps.", colors: [C.black], variants: [{ ram: "", storage: "", price: 1199 }], specifications: [{ label: "Display", value: "2.4-inch" }, { label: "Battery", value: "2000mAh" }, { label: "Features", value: "VoLTE Calling, JioTV, JioCinema" }], featured: false, tags: ["Feature Phone", "4G"] }),
  p({ id: "jio-k1", name: "Jio K1", slug: "jio-k1", brand: "Jio", brandSlug: "jio", imageFolder: "jio-k1", type: "feature-phone", category: "budget", stock: "inStock", description: "A 4G keypad phone with a 2.8-inch display.", colors: [C.black], variants: [{ ram: "", storage: "", price: 1499 }], specifications: [{ label: "Display", value: "2.8-inch" }, { label: "Battery", value: "2500mAh" }, { label: "Features", value: "Jio Apps Support" }], featured: false, tags: ["Feature Phone", "4G"] }),
  p({ id: "jio-j1", name: "Jio J1 Bharat", slug: "jio-j1", brand: "Jio", brandSlug: "jio", imageFolder: "jio-j1", type: "feature-phone", category: "budget", stock: "inStock", description: "An entry-level Jio Bharat feature phone.", colors: [C.black, C.blue], variants: [{ ram: "", storage: "", price: 999 }], specifications: [{ label: "Display", value: "2.4-inch" }, { label: "Battery", value: "1800mAh" }, { label: "Features", value: "HD Voice Calling, FM Radio" }], featured: false, tags: ["Feature Phone", "4G"] }),
  p({ id: "jio-blue", name: "Jio Blue", slug: "jio-blue", brand: "Jio", brandSlug: "jio", imageFolder: "jio-blue", type: "feature-phone", category: "budget", stock: "inStock", description: "A Jio feature phone with Bluetooth and Jio apps.", colors: [C.blue], variants: [{ ram: "", storage: "", price: 1799 }], specifications: [{ label: "Display", value: "2.8-inch" }, { label: "Battery", value: "2500mAh" }, { label: "Features", value: "Bluetooth, Jio Apps" }], featured: false, tags: ["Feature Phone", "4G"] }),
  p({ id: "jio-prime-2", name: "Jio Prime 2", slug: "jio-prime-2", brand: "Jio", brandSlug: "jio", imageFolder: "jio-prime-2", type: "feature-phone", category: "budget", stock: "inStock", description: "A 4G smart feature phone with WhatsApp, YouTube, and Jio apps.", colors: [C.blue], variants: [{ ram: "", storage: "", price: 2999 }], specifications: [{ label: "Display", value: "2.4-inch" }, { label: "Processor", value: "Qualcomm Chipset" }, { label: "Features", value: "WhatsApp, YouTube, Jio Apps" }], featured: false, tags: ["Feature Phone", "4G"] }),
  p({ id: "jio-super-4g-router", name: "Jio Super 4G+ Router", slug: "jio-super-4g-router", brand: "Jio", brandSlug: "jio", imageFolder: "jio-super-4g-router", type: "accessory", category: "accessory", stock: "inStock", description: "A portable 4G+ Wi-Fi router by Jio.", colors: [C.white], variants: [{ ram: "", storage: "", price: 2499 }], specifications: [{ label: "Type", value: "4G Wi-Fi Router" }, { label: "Connectivity", value: "4G LTE" }, { label: "Battery", value: "3000mAh (portable model)" }, { label: "Features", value: "High-Speed Internet Sharing, Supports Multiple Devices" }], featured: false, tags: ["Router", "4G+"] }),

  // ════════════════ Budget / regional brands ════════════════
  p({ id: "ai-plus", name: "AI+ Phone", slug: "ai-plus", brand: "AI+", brandSlug: "ai-plus", imageFolder: "ai-plus", image: "/images/products/ai-plus/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "A budget AI+ smartphone with 4G connectivity.", colors: [C.red, C.purple], variants: [{ ram: "4 GB", storage: "64 GB", price: 7999 }], specifications: [{ label: "Display", value: '6.6" HD+ LCD' }, { label: "Processor", value: "Entry-level Octa-core" }, { label: "Camera", value: "13MP AI Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "10W" }, { label: "OS", value: "Android" }], featured: false, tags: ["Budget", "4G", "EMI Available"] }),
  p({ id: "ai-plus-6gb", name: "AI+ Phone (6GB)", slug: "ai-plus-6gb", brand: "AI+", brandSlug: "ai-plus", imageFolder: "ai-plus", image: "/images/products/ai-plus/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "AI+ phone with 6GB RAM and 4G connectivity.", colors: [C.black, C.purple], variants: [{ ram: "6 GB", storage: "128 GB", price: 9999 }], specifications: [{ label: "Display", value: '6.7" HD+ LCD, 90Hz' }, { label: "Processor", value: "Octa-core 4G chipset" }, { label: "Camera", value: "50MP AI Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "18W" }, { label: "OS", value: "Android" }], featured: false, tags: ["4G", "Budget", "EMI Available"] }),
  p({ id: "ai-nova-2", name: "AI+ Nova2 5G", slug: "ai-nova-2", brand: "AI+", brandSlug: "ai-plus", imageFolder: "ai-nova-2", type: "smartphone", category: "budget", stock: "inStock", description: "A 5G AI+ Nova2 with Dimensity chipset.", colors: [C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 11999 }, { ram: "6 GB", storage: "128 GB", price: 13999 }], specifications: [{ label: "Display", value: '6.72" FHD+ LCD, 120Hz' }, { label: "Processor", value: "Dimensity 6300" }, { label: "Camera", value: "50MP AI Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "33W" }, { label: "OS", value: "Android" }], featured: false, tags: ["5G", "Budget", "EMI Available"] }),
  p({ id: "ai-tab", name: "AI+ Tab", slug: "ai-tab", brand: "AI+", brandSlug: "ai-plus", imageFolder: "ai-tab", type: "tablet", category: "budget", stock: "inStock", description: "A budget AI+ tablet with SIM calling.", colors: [C.black], variants: [{ ram: "6 GB", storage: "128 GB", price: 13999 }], specifications: [{ label: "Display", value: '10.95" FHD+ Display' }, { label: "Processor", value: "Octa-core Processor" }, { label: "Connectivity", value: "SIM Calling, Wi-Fi, Bluetooth" }, { label: "Battery", value: "7000mAh" }], featured: false, tags: ["Tablet", "SIM Calling", "EMI Available"] }),
  p({ id: "coolpad-30i", name: "Coolpad Cool 30i", slug: "coolpad-30i", brand: "Coolpad", brandSlug: "coolpad", imageFolder: "coolpad-30i", image: "/images/products/coolpad-30i/1.jpg", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Coolpad with 6 GB RAM and 256 GB storage.", colors: [C.black], variants: [{ ram: "6 GB", storage: "256 GB", price: 11999 }], specifications: [{ label: "Display", value: '6.56" HD+ LCD, 90Hz' }, { label: "Processor", value: "Unisoc T616" }, { label: "Camera", value: "50MP AI Dual Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "18W" }, { label: "Features", value: "Side Fingerprint Sensor, Expandable Storage" }], featured: false, tags: ["Budget", "EMI Available"] }),
  p({ id: "hmd-vibe-2", name: "HMD Vibe 2", slug: "hmd-vibe-2", brand: "HMD", brandSlug: "hmd", imageFolder: "hmd-vibe-2", type: "smartphone", category: "budget", stock: "inStock", description: "A budget HMD 5G phone with a clean Android experience.", colors: [C.blue, C.purple, C.lavender], variants: [{ ram: "4 GB", storage: "64 GB", price: 12999 }, { ram: "4 GB", storage: "128 GB", price: 14999 }], specifications: [{ label: "Display", value: '6.56" HD+ LCD, 90Hz' }, { label: "Processor", value: "Unisoc T760 5G" }, { label: "Camera", value: "50MP AI Rear Camera" }, { label: "Front Camera", value: "8MP" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "18W" }], featured: false, tags: ["5G", "Budget", "EMI Available"] }),
  p({ id: "itel-a100c", name: "Itel A100C", slug: "itel-a100c", brand: "Itel", brandSlug: "itel", imageFolder: "itel-a100c", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Itel smartphone with 2GB RAM.", colors: [C.black], variants: [{ ram: "2 GB", storage: "64 GB", price: 6299 }], specifications: [{ label: "Display", value: '6.6" HD+ LCD' }, { label: "Processor", value: "Unisoc Octa-core" }, { label: "Camera", value: "8MP AI Rear Camera" }, { label: "Front Camera", value: "5MP" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "10W" }, { label: "Features", value: "Face Unlock, Expandable Storage, Android Go Edition" }], featured: false, tags: ["Budget", "EMI Available"] }),
  p({ id: "lava-bold-n2", name: "Lava Bold N2", slug: "lava-bold-n2", brand: "Lava", brandSlug: "lava", imageFolder: "lava-bold-n2", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Indian-made Lava smartphone.", colors: [C.black, C.white], variants: [{ ram: "4 GB", storage: "64 GB", price: 8990 }], specifications: [{ label: "Display", value: '6.56" HD+ LCD, 90Hz' }, { label: "Processor", value: "Unisoc Octa-core" }, { label: "Camera", value: "13MP AI Rear Camera" }, { label: "Battery", value: "5000mAh" }, { label: "Charging", value: "10W" }, { label: "Features", value: "Android Go Edition, Face Unlock" }], featured: false, tags: ["Budget", "EMI Available"] }),
  p({ id: "peace-17-maxx", name: "Peace Nova 17 Maxx", slug: "peace-17-maxx", brand: "Peace", brandSlug: "peace", imageFolder: "peace-17-maxx", type: "smartphone", category: "budget", stock: "inStock", description: "A budget large-display smartphone.", colors: [C.orange], variants: [{ ram: "4 GB", storage: "128 GB", price: 5999 }, { ram: "6 GB", storage: "128 GB", price: 6999 }], specifications: [{ label: "Display", value: '6.8" LCD' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "13 MP + 2 MP" }, { label: "Battery", value: "5000 mAh" }], featured: false, tags: ["Budget", "EMI Available"] }),
  p({ id: "peace-17-pro", name: "Peace Nova 17 Pro", slug: "peace-17-pro", brand: "Peace", brandSlug: "peace", imageFolder: "peace-17-pro", type: "smartphone", category: "budget", stock: "inStock", description: "A budget large-display smartphone with a premium look.", colors: [C.orange], variants: [{ ram: "4 GB", storage: "64 GB", price: 4999 }, { ram: "4 GB", storage: "128 GB", price: 5999 }, { ram: "6 GB", storage: "128 GB", price: 6999 }], specifications: [{ label: "Display", value: '6.8" LCD' }, { label: "Processor", value: "Octa-core" }, { label: "Camera", value: "13 MP + 2 MP" }, { label: "Battery", value: "5000 mAh" }], featured: false, tags: ["Budget", "EMI Available"] }),
  p({ id: "snexian-t450", name: "Snexian T450", slug: "snexian-t450", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t450", type: "smartphone", category: "budget", stock: "inStock", description: "An entry-level smartphone with 5.5-inch display.", colors: [C.orange, C.blue], variants: [{ ram: "3 GB", storage: "16 GB", price: 4499 }], specifications: [{ label: "Display", value: '5.5" HD' }, { label: "Battery", value: "3000 mAh" }], featured: false, tags: ["Budget"] }),
  p({ id: "snexian-t240", name: "Snexian Bold T240", slug: "snexian-t240", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t240", type: "feature-phone", category: "budget", stock: "inStock", description: "A keypad feature phone with a big battery.", colors: [C.black], variants: [{ ram: "", storage: "", price: 3499 }], specifications: [{ label: "Display", value: '2.8"' }, { label: "Battery", value: "3000 mAh" }, { label: "Features", value: "Bluetooth, FM Radio" }], featured: false, tags: ["Feature Phone"] }),
  p({ id: "snexian-t170", name: "Snexian Rock Bold T170", slug: "snexian-t170", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t170", type: "feature-phone", category: "budget", stock: "inStock", description: "A compact keypad feature phone.", colors: [C.black], variants: [{ ram: "", storage: "", price: 3299 }], specifications: [{ label: "Display", value: '2.4"' }, { label: "Battery", value: "2500 mAh" }, { label: "Features", value: "Wireless FM, Dual SIM" }], featured: false, tags: ["Feature Phone"] }),
  p({ id: "snexian-t150", name: "Snexian Bold T150", slug: "snexian-t150", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t150", type: "feature-phone", category: "budget", stock: "inStock", description: "A basic keypad feature phone.", colors: [C.black], variants: [{ ram: "", storage: "", price: 3499 }], specifications: [{ label: "Display", value: '2.4"' }, { label: "Battery", value: "2500 mAh" }, { label: "Features", value: "Dual SIM, FM Radio, Torch" }], featured: false, tags: ["Feature Phone"] }),
  p({ id: "snexian-t670", name: "Snexian Bold T670", slug: "snexian-t670", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t670", image: "/images/products/snexian-t670/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "A budget smartphone with 6.5-inch display.", colors: [C.silver, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 5999 }], specifications: [{ label: "Display", value: '6.5" HD+' }, { label: "Camera", value: "13MP Rear Camera" }, { label: "Battery", value: "5000 mAh" }], featured: false, tags: ["Budget"] }),
  p({ id: "snexian-t660", name: "Snexian Bold T660", slug: "snexian-t660", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t660", image: "/images/products/snexian-t660/1.jpeg", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Android smartphone with 6.1-inch display.", colors: [C.black], variants: [{ ram: "3 GB", storage: "16 GB", price: 4999 }], specifications: [{ label: "Display", value: '6.1" HD+' }, { label: "Battery", value: "4000 mAh" }], featured: false, tags: ["Budget"] }),
  p({ id: "snexian-tab-t1000", name: "Snexian Tab T1000", slug: "snexian-tab-t1000", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-tab-t1000", type: "tablet", category: "budget", stock: "inStock", description: "A budget tablet with a big screen for media and browsing.", colors: [C.orange, C.silver], variants: [{ ram: "4 GB", storage: "64 GB", price: 7999 }], specifications: [{ label: "Display", value: '10.1" HD' }, { label: "Battery", value: "6000 mAh" }, { label: "Connectivity", value: "Wi-Fi, Bluetooth" }], featured: false, tags: ["Tablet", "Budget"] }),
  p({ id: "snexian-t17p", name: "Snexian T17P", slug: "snexian-t17p", brand: "Snexian", brandSlug: "snexian", imageFolder: "snexian-t17p", type: "smartphone", category: "budget", stock: "inStock", description: "A budget Snexian smartphone with 4G.", colors: [C.gold, C.orange, C.blue], variants: [{ ram: "4 GB", storage: "64 GB", price: 5999 }], specifications: [{ label: "Display", value: '6.5" HD+' }, { label: "Camera", value: "8MP Rear Camera" }, { label: "Battery", value: "5000 mAh" }], featured: false, tags: ["Budget", "4G"] }),
];

// ── Helper functions ──

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByBrand(brandSlug: string): Product[] {
  return products.filter((p) => p.brandSlug === brandSlug.toLowerCase());
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category);
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.category === "best-seller");
}

export function getNewArrivals(): Product[] {
  return products.filter((p) => p.category === "new-arrival");
}

export function getDeals(): Product[] {
  return products.filter((p) => p.category === "deal");
}

export function getFlagshipProducts(): Product[] {
  return products.filter((p) => p.category === "flagship");
}

export function getStartingPrice(product: Product): number | undefined {
  const prices = product.variants
    .map((v) => v.price)
    .filter((pr): pr is number => typeof pr === "number");
  if (prices.length) return Math.min(...prices);
  return product.price;
}

export function isPriceOnEnquiry(product: Product): boolean {
  return Boolean(product.priceOnEnquiry) || getStartingPrice(product) === undefined;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getVariantByKey(
  product: Product,
  ram: string,
  storage: string
): ProductVariant | undefined {
  return product.variants.find((v) => v.ram === ram && v.storage === storage);
}

export function getProductsByType(type: Product["type"]): Product[] {
  return products.filter((p) => p.type === type);
}
