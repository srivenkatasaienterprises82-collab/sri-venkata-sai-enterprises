import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_VARIANT_METADATA_PATH, parseVariantMetadataMarkdown } from "../src/lib/data/variant-metadata";
import { products } from "../src/lib/data/products";

const args = new Set(process.argv.slice(2));
const inputArg = process.argv.find((arg) => arg.startsWith("--in="));
const inputPath = inputArg?.slice("--in=".length) || DEFAULT_VARIANT_METADATA_PATH;
const markdown = readFileSync(inputPath, "utf8");
const parsed = parseVariantMetadataMarkdown(markdown);
const knownSlugs = new Set(products.map((product) => product.slug));
const unknownSlugs = parsed.items.filter((item) => !knownSlugs.has(item.slug));

if (unknownSlugs.length > 0) {
  const csv = ["slug,name,url", ...unknownSlugs.map((item) => `${item.slug},${JSON.stringify(item.name)},${item.url}`)].join("\n");
  writeFileSync("unknown_slugs.csv", `${csv}\n`);
}

console.log(`variant_metadata_count=${parsed.items.length}`);
console.log(`known_count=${parsed.items.length - unknownSlugs.length}`);
console.log(`unknown_count=${unknownSlugs.length}`);

if (args.has("--check") && unknownSlugs.length > 0) {
  process.exitCode = 1;
}
