import { createImageUrlBuilder } from "@sanity/image-url";
import { client } from "@/sanity/client";

const builder = createImageUrlBuilder(client);

export function urlForImage(source: any): string {
  return builder.image(source).url();
}

/**
 * Resolve any image value into a plain URL string the frontend can use.
 * Handles both Sanity image objects (after migration) and legacy URL/path
 * strings (from the static fallback or not-yet-migrated docs).
 */
export function resolveImage(value: unknown): string {
  if (!value) return "";
  if (
    typeof value === "object" &&
    value !== null &&
    (value as any)._type === "image" &&
    (value as any).asset
  ) {
    try {
      return urlForImage(value as any);
    } catch {
      return "";
    }
  }
  if (typeof value === "string") return value.trim();
  return "";
}
