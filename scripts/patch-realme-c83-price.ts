/**
 * Patch: Update Realme C83 price + Redmi A5 amazonUrl + OnePlus Buds Z3 amazonUrl in Sanity.
 *
 * Usage:
 *   npx tsx scripts/patch-realme-c83-price.ts
 *
 * Environment:
 *   Reads SANITY_PROJECT_ID, SANITY_DATASET, SANITY_TOKEN from .env.local
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const TOKEN = process.env.SANITY_TOKEN!;

if (!PROJECT_ID || !DATASET || !TOKEN) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, or SANITY_TOKEN in .env.local");
  process.exit(1);
}

const SANITY_API = `https://${PROJECT_ID}.api.sanity.io/v2023-08-01/data/mutate/${DATASET}`;

async function main() {
  const mutations: any[] = [
    // 1. Realme C83 - price update
    {
      patch: {
        id: "product-realme-c83",
        set: {
          price: 16400,
          lastUpdated: new Date().toISOString(),
        },
        unset: ["priceOnEnquiry"],
      },
    },
    // 2. Realme C83 - update variant price (variant _key is predictable from seed script)
    {
      patch: {
        id: "product-realme-c83",
        set: {
          "variants[_key==\"v-0-4GB-64GB\"].price": 16400,
          "variants[_key==\"v-0-4GB-64GB\"].originalPrice": 16400,
        },
      },
    },
    // 3. Realme C83 - update flipkartUrl to correct product URL
    {
      patch: {
        id: "product-realme-c83",
        set: {
          flipkartUrl: "https://www.flipkart.com/realme-c83-5g-blooming-purple-64-gb/p/itm85479b4419036",
        },
      },
    },
    // 4. Redmi A5 - fix amazonUrl (was pointing to Lava phone cover)
    {
      patch: {
        id: "product-redmi-a5",
        set: {
          amazonUrl: "https://www.amazon.in/Redmi-Storage-Segments-Smoothest-Expandable/dp/B0F3P2ZL2X",
          lastUpdated: new Date().toISOString(),
        },
      },
    },
    // 5. OnePlus Buds Z3 - fix amazonUrl (was pointing to silicone case)
    {
      patch: {
        id: "product-oneplus-z3",
        set: {
          amazonUrl: "https://www.amazon.in/OnePlus-Wireless-Neckband-Playback-Enhancement/dp/B0FBRGKXHG",
          lastUpdated: new Date().toISOString(),
        },
      },
    },
  ];

  for (const mutation of mutations) {
    try {
      console.log(`Patching: ${mutation.patch.id}`);
      console.log(`  Setting: ${JSON.stringify(mutation.patch.set)}`);
      
      const res = await fetch(SANITY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({ mutations: [mutation] }),
      });

      const body = await res.json();
      if (!res.ok) {
        console.error(`  ERROR (${res.status}):`, JSON.stringify(body, null, 2));
      } else {
        console.log(`  OK:`, JSON.stringify(body, null, 2));
      }
    } catch (err) {
      console.error(`  FETCH ERROR:`, err);
    }
  }

  // 6. Update Redmi A5 variant-level amazonUrl
  await patchVariant("product-redmi-a5", "v-0-3GB-64GB", "amazonUrl", "https://www.amazon.in/Redmi-Storage-Segments-Smoothest-Expandable/dp/B0F3P2ZL2X");
  await patchVariant("product-redmi-a5", "v-1-4GB-128GB", "amazonUrl", "https://www.amazon.in/Redmi-Storage-Segments-Smoothest-Expandable/dp/B0F3P2ZL2X");

  // 7. Update OnePlus Buds Z3 variant-level amazonUrl
  await patchVariant("product-oneplus-z3", "v-0--", "amazonUrl", "https://www.amazon.in/OnePlus-Wireless-Neckband-Playback-Enhancement/dp/B0FBRGKXHG");

  // 8. Realme P3x - ensure the correct flipkartUrl in Sanity
  await sanityPatch("product-realme-p3x", {
    flipkartUrl: "https://www.flipkart.com/realme-p3x-5g-lunar-silver-128-gb/p/itmab5a4b09b6ccc",
    lastUpdated: new Date().toISOString(),
  });
}

async function sanityPatch(id: string, set: Record<string, any>) {
  try {
    console.log(`Patching: ${id}`);
    console.log(`  Setting: ${JSON.stringify(set)}`);
    
    const res = await fetch(SANITY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ mutations: [{ patch: { id, set } }] }),
    });

    const body = await res.json();
    if (!res.ok) {
      console.error(`  ERROR (${res.status}):`, JSON.stringify(body, null, 2));
    } else {
      console.log(`  OK:`, JSON.stringify(body, null, 2));
    }
  } catch (err) {
    console.error(`  FETCH ERROR:`, err);
  }
}

async function patchVariant(productId: string, key: string, field: string, value: string) {
  try {
    console.log(`Patching: ${productId} - variant ${key} ${field}`);
    const res = await fetch(SANITY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        mutations: [
          {
            patch: {
              id: productId,
              set: {
                [`variants[_key=="${key}"].${field}`]: value,
              },
            },
          },
        ],
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error(`  ERROR (${res.status}):`, JSON.stringify(body, null, 2));
    } else {
      console.log(`  OK:`, JSON.stringify(body, null, 2));
    }
  } catch (err) {
    console.error(`  FETCH ERROR:`, err);
  }
}

main().catch(console.error);
