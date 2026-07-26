import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  token: process.env.SANITY_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function main() {
  // 1. Find the product
  const products = await client.fetch(`*[_type == "product" && name match "Nothing Phone 4a Pro"]{_id, name, slug, featured, enabled}`);
  console.log("Found products:", JSON.stringify(products, null, 2));

  // 2. Check if published version exists
  const publishedId = "product-nothing-phone-4a-pro";
  const published = await client.fetch(`*[_type == "product" && _id == $id][0]{_id}`, { id: publishedId });
  console.log("Published version exists:", !!published);

  // 3. If only draft exists, publish it by creating the published document
  const draftProduct = products.find((p: any) => p._id.startsWith("drafts."));
  if (draftProduct && !published) {
    console.log("Publishing draft product...");
    // Create the published version by cloning the draft
    const doc = await client.fetch(`*[_type == "product" && _id == "drafts.product-nothing-phone-4a-pro"][0]`, {});
    if (doc) {
      delete doc._id;
      delete doc._rev;
      delete doc._createdAt;
      delete doc._updatedAt;
      await client.createOrReplace({
        ...doc,
        _id: publishedId,
        _type: "product",
      });
      console.log("Published successfully!");
    }
  }

  // 4. Get the homePage document
  const homePage = await client.fetch(`*[_type == "homePage"][0]{_id, _rev}`);
  console.log("HomePage _id:", homePage._id);

  // 5. Get current featuredCarousel refs
  const refs = await client.fetch(`*[_type == "homePage"][0]{"refs": featuredCarousel[]->{_id,name}}`);
  const existingIds = (refs.refs || []).map((r: any) => r._id);
  console.log("Current featured carousel products:");
  (refs.refs || []).forEach((r: any) => console.log("  -", r.name, "(" + r._id + ")"));

  // 6. Check if Nothing Phone 4a Pro is already in the carousel
  if (existingIds.includes(publishedId)) {
    console.log("Nothing Phone 4a Pro is ALREADY in the featuredCarousel!");
    return;
  }

  // 7. Add it
  const currentCarousel = await client.fetch(`*[_type == "homePage"][0]{"refs": featuredCarousel}`);
  const currentRefs = (currentCarousel.refs || []).map((r: any) => 
    typeof r === "object" ? r._ref : r
  );

  // Create a transaction to add the reference
  await client
    .patch(homePage._id)
    .setIfMissing({ featuredCarousel: [] })
    .append("featuredCarousel", [{ _type: "reference", _ref: publishedId, _key: `ref-${Date.now()}` }])
    .commit({ autoGenerateArrayKeys: true });

  console.log("✅ Added Nothing Phone 4a Pro to featuredCarousel!");

  // 8. Verify
  const verify = await client.fetch(`*[_type == "homePage"][0]{"refs": featuredCarousel[]->{name,slug}}`);
  console.log("Updated carousel (" + (verify.refs?.length || 0) + " products):");
  (verify.refs || []).forEach((r: any) => console.log("  -", r.name, "(" + r.slug.current + ")"));
}

main().catch(console.error);
