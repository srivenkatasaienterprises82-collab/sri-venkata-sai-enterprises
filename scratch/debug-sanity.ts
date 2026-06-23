import { createClient } from "next-sanity";
import { HOME_PAGE_QUERY, BRANDS_QUERY, PRODUCTS_QUERY, TESTIMONIALS_QUERY } from "../src/sanity/queries";

const client = createClient({
  projectId: "fs9q51h4",
  dataset: "production",
  apiVersion: "2026-06-23",
  useCdn: false,
});

async function run() {
  console.log("🔍 Fetching live Sanity data to debug...");

  try {
    const homepage = await client.fetch(HOME_PAGE_QUERY);
    console.log("\n🏠 Home Page Config:");
    console.log(JSON.stringify(homepage, null, 2));
  } catch (err) {
    console.error("Error fetching homepage config:", err);
  }

  try {
    const brands = await client.fetch(BRANDS_QUERY);
    console.log(`\n🏷️ Brands Count: ${brands?.length || 0}`);
    console.log(JSON.stringify(brands, null, 2));
  } catch (err) {
    console.error("Error fetching brands:", err);
  }

  try {
    const products = await client.fetch(PRODUCTS_QUERY);
    console.log(`\n📱 Products Count: ${products?.length || 0}`);
    console.log(JSON.stringify(products?.slice(0, 3), null, 2));
  } catch (err) {
    console.error("Error fetching products:", err);
  }

  try {
    const testimonials = await client.fetch(TESTIMONIALS_QUERY);
    console.log(`\n⭐ Testimonials Count: ${testimonials?.length || 0}`);
    console.log(JSON.stringify(testimonials, null, 2));
  } catch (err) {
    console.error("Error fetching testimonials:", err);
  }
}

run();
