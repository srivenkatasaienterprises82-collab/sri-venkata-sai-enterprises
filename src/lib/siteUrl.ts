/**
 * Canonical site origin for metadataBase, canonicals, sitemap, robots and
 * JSON-LD.
 *
 * The production site is served from `www.srivenkatasaienterprises.com`; the
 * apex domain 308-redirects to it. `NEXT_PUBLIC_SITE_URL` has historically
 * been set to the apex, which made every canonical/sitemap URL point at a URL
 * that redirects — the classic Search Console "Page with redirect" cause.
 * Normalising the apex to www keeps every emitted URL on the one that actually
 * returns 200. Non-production hosts (preview deployments) pass through as-is.
 */
const CANONICAL_ORIGIN = "https://www.srivenkatasaienterprises.com";
const APEX_HOST = "srivenkatasaienterprises.com";

export function resolveSiteUrl(configured?: string | null): string {
  const raw = configured?.trim();
  if (!raw) return CANONICAL_ORIGIN;

  try {
    const url = new URL(raw);
    if (url.hostname === APEX_HOST) {
      url.hostname = `www.${APEX_HOST}`;
    }
    return url.origin;
  } catch {
    return CANONICAL_ORIGIN;
  }
}

export const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
