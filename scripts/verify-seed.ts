import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const c = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  token: process.env.SANITY_TOKEN!,
  apiVersion: "2024-01-01",
  useCdn: false,
});
async function main() {
  const slugs = ["vivo-v70-elite", "samsung-s25-ultra", "cmf-3a-lite", "jio-v4", "jio-k1", "moto-70-fusion", "realme-16-pro", "moto-edge-60"];
  for (const slug of slugs) {
    const d: any = await c.fetch(
      `*[_type=='product' && slug.current==$s][0]{name,'price':price,'variants':variants[]{ram,storage,price,originalPrice},'colors':colors[]{name}}`,
      { s: slug }
    );
    console.log("\n" + slug + ":", d ? d.name + " price=" + d.price : "NOT IN SANITY");
    if (d) {
      console.log("  colors:", (d.colors || []).map((x: any) => x.name).join(", "));
      console.log("  variants:", (d.variants || []).map((v: any) => v.ram + "/" + v.storage + "=" + v.price + (v.originalPrice ? "(MRP " + v.originalPrice + ")" : "")).join(", "));
    }
  }
}
main();
