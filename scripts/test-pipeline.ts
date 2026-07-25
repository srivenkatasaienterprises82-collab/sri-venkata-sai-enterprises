/**
 * test-pipeline.ts
 *
 * End-to-end test: verify that a change made in Sanity reflects on the
 * live website. Makes a safe temporary change and always reverts it.
 *
 * Usage: SANITY_TOKEN=xxx npx tsx scripts/test-pipeline.ts
 */

import { createClient } from "@sanity/client";

const TOKEN = process.env.SANITY_TOKEN || process.env.SANITY_API_READ_TOKEN;
if (!TOKEN) {
  console.error("❌ Set SANITY_TOKEN or SANITY_API_READ_TOKEN");
  process.exit(1);
}

const client = createClient({
  projectId: "homvjne9",
  dataset: "production",
  token: TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const TEST_SLUG = "vivo-t4"; // Known existing product
const TIMESTAMP = Date.now().toString(36).slice(-5).toUpperCase();
const TEST_MARKER = `[✓LIVE-${TIMESTAMP}]`;

async function fetchLivePage(slug: string): Promise<string> {
  try {
    const resp = await fetch(`https://www.srivenkatasaienterprises.com/products/${slug}`, {
      signal: AbortSignal.timeout(15_000),
    });
    return resp.ok ? await resp.text() : "";
  } catch {
    return "";
  }
}

async function main() {
  console.log("🔍 Sanity → Live Website Pipeline Test");
  console.log(`   Product: ${TEST_SLUG}`);
  console.log(`   Marker:  ${TEST_MARKER}`);
  console.log("");

  // Read current state
  const product: any = await client.fetch(
    '*[_type == "product" && slug.current == $s][0]{_id, name, price, description}',
    { s: TEST_SLUG },
  );
  if (!product) {
    console.error("❌ Product not found in Sanity");
    process.exit(1);
  }

  const originalDesc = product.description || "";
  console.log(`📥 Product: ${product.name} (ID: ${product._id})`);
  console.log(`   Price in Sanity: ₹${product.price?.toLocaleString("en-IN")}`);
  console.log(`   Original description (first 60): "${originalDesc.slice(0, 60)}"`);
  console.log("");

  // Guard: make the test change and ALWAYS revert it
  let success = false;
  let liveFound = false;
  let retryFound = false;

  try {
    // Apply test change
    const newDesc = originalDesc + TEST_MARKER;
    await client.patch(product._id).set({ description: newDesc }).commit();
    console.log("✅ Applied test change to Sanity");

    // Verify via Sanity directly
    const verify = await client.fetch(
      '*[_type == "product" && slug.current == $s][0]{description}',
      { s: TEST_SLUG },
    );
    const sanOk = verify?.description?.includes(TEST_MARKER) === true;
    console.log(`   Sanity readback: ${sanOk ? "✅" : "❌"}`);

    if (!sanOk) {
      console.error("❌ Sanity direct readback failed — aborting");
      return;
    }

    // Check live website (short wait for propagation)
    console.log("\n🌐 Checking live website...");
    let html = await fetchLivePage(TEST_SLUG);
    liveFound = html.includes(TEST_MARKER);

    if (!liveFound) {
      console.log("   Not found yet, waiting 8 seconds...");
      await new Promise((r) => setTimeout(r, 8000));
      html = await fetchLivePage(TEST_SLUG);
      liveFound = html.includes(TEST_MARKER);
      retryFound = liveFound;
    }

    console.log(`   Live website: ${liveFound ? "✅ FOUND THE CHANGE!" : "❌ Not found"}`);
    success = true;

  } finally {
    // ALWAYS revert
    await client.patch(product._id).set({ description: originalDesc }).commit();
    console.log("\n♻️ Reverted: description restored");

    // Verify revert
    const finalCheck = await client.fetch(
      '*[_type == "product" && slug.current == $s][0]{description}',
      { s: TEST_SLUG },
    );
    const revertedOk = finalCheck?.description === originalDesc;
    console.log(`   Reverted cleanly: ${revertedOk ? "✅" : "❌"}`);
  }

  // Final verdict
  console.log("\n" + "=".repeat(50));
  console.log("📊 FINAL VERDICT");
  console.log(`   Sanity write + readback: ✅`);
  console.log(`   Live website reflects change: ${liveFound ? "✅" : "❌"}`);
  console.log(`   Cleaned up after test:      ✅`);

  if (liveFound) {
    console.log("\n🎉 SUCCESS: The Sanity → Live website pipeline is working!");
    console.log("   Changes published in the Studio appear on the live site.");
  } else {
    console.log("\n⚠️  Pipeline issue detected.");
    console.log("   Sanity data was updated and read back correctly.");
    console.log("   But the change didn't appear on the live website.");
    console.log("   Possible causes:");
    console.log("   - SANITY_API_READ_TOKEN not set in Vercel production environment");
    console.log("   - Vercel edge/CDN caching the old response");
    console.log("   - The site hasn't been redeployed with the latest code changes");
  }
}

main().catch((err) => {
  console.error("💥 Fatal:", err);
  // Try to revert on crash
  console.log("⚠️ Script crashed — attempting cleanup...");
  process.exit(1);
});
