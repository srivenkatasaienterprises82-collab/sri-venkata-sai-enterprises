import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_VARIANT_METADATA_PATH, parseVariantMetadataMarkdown } from "../src/lib/data/variant-metadata";
import { products } from "../src/lib/data/products";

const sourcePath = process.argv.find((arg) => arg.startsWith("--in="))?.slice("--in=".length) || DEFAULT_VARIANT_METADATA_PATH;
const markdown = readFileSync(sourcePath, "utf8");
const parsed = parseVariantMetadataMarkdown(markdown);
const productSlugs = new Set(products.map((product) => product.slug));
const unknownSlugs = parsed.items.filter((item) => !productSlugs.has(item.slug));

if (unknownSlugs.length > 0) {
  console.error(`Unknown slugs: ${unknownSlugs.map((item) => item.slug).join(", ")}`);
  process.exit(1);
}

function findFieldEnd(block: string, fieldStart: number): number {
  const colonIndex = block.indexOf(":", fieldStart);
  if (colonIndex === -1) return -1;
  const bracketStart = block.indexOf("[", colonIndex);
  if (bracketStart === -1) {
    const commaIdx = block.indexOf(",", colonIndex);
    return commaIdx === -1 ? -1 : commaIdx + 1;
  }
  const bracketEnd = block.indexOf("]", bracketStart);
  if (bracketEnd === -1) return -1;
  const commaIdx = block.indexOf(",", bracketEnd);
  return commaIdx === -1 ? -1 : commaIdx + 1;
}

let source = readFileSync("src/lib/data/products.ts", "utf8");
let applied = 0;

for (const item of parsed.items) {
  const marker = `slug: "${item.slug}"`;
  const index = source.indexOf(marker);
  if (index === -1) continue;

  const insert = `ramOptions: ${JSON.stringify(item.ramOptions)}, storageOptions: ${JSON.stringify(item.storageOptions)}, `;
  const start = source.lastIndexOf("p({", index);
  const end = source.indexOf("}),", index);
  if (start === -1 || end === -1 || end <= start) continue;

  const block = source.slice(start, end);
  const existingRamIndex = block.indexOf("ramOptions:");
  const existingStorageIndex = block.indexOf("storageOptions:");

  if (existingRamIndex !== -1 && existingStorageIndex !== -1) {
    const ramStart = existingRamIndex;
    const storageEnd = findFieldEnd(block, existingStorageIndex);
    if (storageEnd === -1) continue;
    source = source.slice(0, start) + block.slice(0, ramStart) + insert + block.slice(storageEnd) + source.slice(end);
  } else if (existingRamIndex !== -1) {
    const ramStart = existingRamIndex;
    const ramEnd = findFieldEnd(block, ramStart);
    if (ramEnd === -1) continue;
    source = source.slice(0, start) + block.slice(0, ramStart) + insert + block.slice(ramEnd) + source.slice(end);
  } else if (existingStorageIndex !== -1) {
    const storageStart = existingStorageIndex;
    const storageEnd = findFieldEnd(block, storageStart);
    if (storageEnd === -1) continue;
    source = source.slice(0, start) + block.slice(0, storageStart) + insert + block.slice(storageEnd) + source.slice(end);
  } else {
    source = source.slice(0, index) + insert + source.slice(index);
  }
  applied += 1;
}

writeFileSync("src/lib/data/products.ts", source);
console.log(`applied_count=${applied}`);
