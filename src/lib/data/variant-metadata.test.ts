import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseVariantMetadataMarkdown, splitOptions } from "./variant-metadata";

const sample = `# Product Variants - Colors, RAM & Storage

## Apple

### iPhone 17
- **Price:** Rs 82,900
- **Colors:** Lavender, Sage, Mist Blue, White, Black
- **RAM:** 8 GB LPDDR5X
- **Storage:** 256 GB / 512 GB
- **URL:** /products/iphone-17

### Apple AirPods 4
- **Price:** Rs 17,900
- **Colors:** White (Standard)
- **RAM:** N/A (Audio device)
- **Storage:** N/A (Audio device)
- **URL:** /products/airpods-4
`;

describe("variant metadata parser", () => {
  it("splits option text while dropping N/A values", () => {
    assert.deepEqual(splitOptions("8 GB / 12 GB LPDDR5X"), ["8 GB", "12 GB LPDDR5X"]);
    assert.deepEqual(splitOptions("N/A (Audio device)"), []);
  });

  it("parses product blocks by slug", () => {
    const parsed = parseVariantMetadataMarkdown(sample);

    assert.equal(parsed.items.length, 2);
    assert.deepEqual(parsed.bySlug.get("iphone-17"), {
      brand: "Apple",
      name: "iPhone 17",
      slug: "iphone-17",
      priceText: "Rs 82,900",
      colorNames: ["Lavender", "Sage", "Mist Blue", "White", "Black"],
      ramOptions: ["8 GB LPDDR5X"],
      storageOptions: ["256 GB", "512 GB"],
      url: "/products/iphone-17",
    });
    assert.deepEqual(parsed.bySlug.get("airpods-4")?.ramOptions, []);
    assert.deepEqual(parsed.bySlug.get("airpods-4")?.storageOptions, []);
  });
});
