export const DEFAULT_VARIANT_METADATA_PATH =
  "C:\\Users\\ramak\\Downloads\\product_variants_colors_ram_storage.md";

export interface VariantMetadataItem {
  brand: string;
  name: string;
  slug: string;
  priceText: string;
  colorNames: string[];
  ramOptions: string[];
  storageOptions: string[];
  url: string;
}

export interface ParsedVariantMetadata {
  items: VariantMetadataItem[];
  bySlug: Map<string, VariantMetadataItem>;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function splitOptions(value: string): string[] {
  const normalized = clean(value);
  if (!normalized || /^n\/a\b/i.test(normalized)) return [];
  return normalized
    .split(/\s*\/\s*|\s*,\s*/g)
    .map(clean)
    .filter(Boolean)
    .filter((item) => !/^n\/a\b/i.test(item));
}

function readField(block: string, label: string): string {
  const match = block.match(new RegExp(`^- \\*\\*${label}:\\*\\*\\s*(.+)$`, "im"));
  return clean(match?.[1] ?? "");
}

function slugFromUrl(url: string): string {
  const match = url.match(/\/products\/([^/?#\s]+)/);
  return match?.[1] ?? "";
}

export function parseVariantMetadataMarkdown(markdown: string): ParsedVariantMetadata {
  const items: VariantMetadataItem[] = [];
  let currentBrand = "";
  const blocks = markdown.split(/(?=^## |^### )/gm);

  for (const block of blocks) {
    const brandMatch = block.match(/^##\s+(.+)$/m);
    if (brandMatch && !block.match(/^###\s+/m)) {
      currentBrand = clean(brandMatch[1]);
      continue;
    }

    const productMatch = block.match(/^###\s+(.+)$/m);
    if (!productMatch) continue;

    const name = clean(productMatch[1]);
    const priceText = readField(block, "Price");
    const colorsText = readField(block, "Colors");
    const ramText = readField(block, "RAM");
    const storageText = readField(block, "Storage");
    const url = readField(block, "URL");
    const slug = slugFromUrl(url);

    if (!slug) continue;

    items.push({
      brand: currentBrand,
      name,
      slug,
      priceText,
      colorNames: splitOptions(colorsText),
      ramOptions: splitOptions(ramText),
      storageOptions: splitOptions(storageText),
      url,
    });
  }

  return { items, bySlug: new Map(items.map((item) => [item.slug, item])) };
}
