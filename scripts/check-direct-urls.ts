import { readFileSync } from "node:fs";
import { products } from "../src/lib/data/products";
import {
  DEFAULT_DIRECT_URLS_CSV_PATH,
  parseDirectUrlsCsv,
  matchSlugs,
  findSearchUrls,
} from "../src/lib/data/direct-urls-parse";

const sourcePath =
  process.argv.find((arg) => arg.startsWith("--in="))?.slice("--in=".length) ||
  DEFAULT_DIRECT_URLS_CSV_PATH;

const csv = readFileSync(sourcePath, "utf8");
const aggregated = parseDirectUrlsCsv(csv);
const slugMatch = matchSlugs(
  aggregated,
  products.map((p) => p.slug),
  products.map((p) => p.name),
);
const matchedProducts = slugMatch.matched.map((m) => m.product);
const searchUrls = findSearchUrls(matchedProducts);
const totalVariants = matchedProducts.reduce((n, p) => n + p.variants.length, 0);

console.log(
  `matched=${slugMatch.matched.length} unknown=${slugMatch.unknown.length} totalVariants=${totalVariants} searchUrls=${searchUrls.length}`,
);

let ok = true;
if (slugMatch.unknown.length > 0) {
  ok = false;
  console.error(`UNKNOWN products: ${slugMatch.unknown.join(" | ")}`);
}
if (searchUrls.length > 0) {
  ok = false;
  console.error(`SEARCH urls found (expected direct product pages): ${searchUrls.length}`);
  for (const u of searchUrls.slice(0, 5)) console.error(`  ${u}`);
}

process.exit(ok ? 0 : 1);
