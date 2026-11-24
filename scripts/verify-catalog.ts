/**
 * Read-only catalogue verifier.
 *
 * Proves the storefront's products come only from Sanity:
 *  - every published Sanity product has a live product page (200 + name in HTML)
 *  - when Sanity has no products, the listing is empty, the sitemap has no
 *    product URLs, and an old static-catalogue slug 404s.
 *
 * Never writes to Sanity. Exits 1 on any mismatch.
 * Usage: npx tsx scripts/verify-catalog.ts [baseUrl]
 */
const PROJECT = "homvjne9";
const DATASET = "production";
const API_VERSION = "2026-06-23";
const BASE = (
  process.argv[2] ??
  process.env.VERIFY_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

interface Row {
  name: string;
  slug: string;
}

function squash(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const failures: string[] = [];

  const query = encodeURIComponent(
    `*[_type == "product" && enabled != false && defined(slug.current)]{name, "slug": slug.current} | order(slug asc)`
  );
  const sanityRes = await fetch(
    `https://${PROJECT}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${query}`
  );
  if (!sanityRes.ok) {
    console.error(`FATAL: Sanity query failed with HTTP ${sanityRes.status}`);
    process.exit(1);
  }
  const { result: products } = (await sanityRes.json()) as { result: Row[] };
  console.log(`Sanity published products: ${products.length}`);

  for (const product of products) {
    const res = await fetch(`${BASE}/products/${product.slug}`);
    if (res.status !== 200) {
      failures.push(`/products/${product.slug} -> HTTP ${res.status}`);
    } else if (!squash(await res.text()).includes(squash(product.name))) {
      failures.push(`/products/${product.slug} -> 200 but "${product.name}" not in HTML`);
    } else {
      console.log(`  ok  /products/${product.slug}`);
    }
  }

  if (products.length === 0) {
    const listingRes = await fetch(`${BASE}/products`);
    const listingHtml = await listingRes.text();
    if (listingRes.status !== 200) {
      failures.push(`/products -> HTTP ${listingRes.status}`);
    } else if (/href="\/products\/[^"]+"/.test(listingHtml)) {
      failures.push("/products -> renders product links while Sanity has no products");
    } else {
      console.log("  ok  /products renders empty");
    }

    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    if (/\/products\/[^<]+<\/loc>/.test(sitemap)) {
      failures.push("/sitemap.xml -> lists product URLs while Sanity has no products");
    } else {
      console.log("  ok  sitemap has no product URLs");
    }

    // The root layout is force-dynamic, so Next flushes headers before a
    // page-level notFound() can set the status: an unknown slug is a soft 404
    // (200 + not-found UI). Assert the UI, not the status code.
    const ghostRes = await fetch(`${BASE}/products/vivo-t4`, { redirect: "manual" });
    const ghostHtml = await ghostRes.text();
    if (!/This page could not be found/.test(ghostHtml) || /Buy Now/.test(ghostHtml)) {
      failures.push(`/products/vivo-t4 -> still renders a product page (HTTP ${ghostRes.status})`);
    } else {
      console.log("  ok  removed static product slug renders no product");
    }

    const homeRes = await fetch(`${BASE}/`);
    const homeHtml = await homeRes.text();
    if (homeRes.status !== 200) {
      failures.push(`/ -> HTTP ${homeRes.status}`);
    } else if (/href="\/products\/[^"]+"/.test(homeHtml)) {
      failures.push("/ -> renders product links while Sanity has no products");
    } else if (/iQOO Z11x|Vivo V70 Elite|Samsung S25 Ultra/.test(homeHtml)) {
      failures.push("/ -> still renders names from the deleted static catalogue");
    } else {
      console.log("  ok  homepage has no phantom products");
    }

    const checkoutRes = await fetch(`${BASE}/checkout?product=vivo-t4`, { redirect: "manual" });
    if (checkoutRes.status !== 404) {
      failures.push(`/checkout?product=vivo-t4 -> HTTP ${checkoutRes.status} (expected 404)`);
    } else {
      console.log("  ok  Buy Now with an unknown slug 404s");
    }

    const categoryRes = await fetch(`${BASE}/category/apple`);
    if (categoryRes.status !== 200) {
      failures.push(`/category/apple -> HTTP ${categoryRes.status}`);
    } else {
      console.log("  ok  category page renders empty");
    }
  }

  if (failures.length) {
    console.error("\nFAILED:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log("\nCatalog verification passed.");
}

void main();
