import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  token: process.env.SANITY_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function main() {
  // Get the draft homePage
  const draft = await client.fetch(`*[_type == "homePage" && _id == "drafts.homePage"][0]`);
  if (!draft) {
    console.log("No draft homePage found");
    return;
  }

  const carouselCount = draft.featuredCarousel?.length || 0;
  console.log(`Draft has ${carouselCount} products in featuredCarousel`);

  // Create published version
  const { _id, _rev, _createdAt, _updatedAt, ...published } = draft;
  
  await client.createOrReplace({
    ...published,
    _id: "homePage",
    _type: "homePage",
  });

  console.log("✅ Published homePage with updated featuredCarousel!");

  // Verify
  const verify = await client.fetch(`*[_type == "homePage"][0]{ featuredCarousel[]->{ name, slug } }`);
  console.log(`Published carousel (${verify.featuredCarousel?.length || 0} products):`);
  verify.featuredCarousel?.forEach((p: any) => console.log(`  - ${p.name} (${p.slug.current})`));
}

main().catch(console.error);
