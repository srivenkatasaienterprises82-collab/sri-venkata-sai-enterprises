import { createClient } from "@sanity/client";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "homvjne9";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const API_VERSION = "2026-06-23";

const token = process.env.SANITY_TOKEN;
if (!token) {
  console.error("❌ SANITY_TOKEN env var is required");
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  useCdn: false,
  token,
});

async function main() {
  const newTitle = "Sri Venkata Sai Enterprises Wholesale and Retail";

  console.log(`Creating/updating homePage with heroTitle → "${newTitle}"`);

  const result = await client.createOrReplace({
    _id: "homePage",
    _type: "homePage",
    heroTitle: newTitle,
  });

  console.log(`✅ HomePage document written (rev: ${result._rev})`);
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
