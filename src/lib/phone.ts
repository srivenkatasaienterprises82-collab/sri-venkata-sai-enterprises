/**
 * Phone/WhatsApp link normalisation.
 *
 * Sanity stores `phoneTel` / `whatsappNumber` as display text (e.g.
 * "+91 7670859484"). Interpolating that straight into `wa.me/...` produced
 * `https://wa.me/+91 ` — a dead link — and `tel:+91 123...` with spaces.
 * These helpers keep display text untouched and only clean the href values.
 */

/** Digits (and a leading +) only, for `tel:` links. */
export function telHref(value: string): string {
  const cleaned = value.trim().replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

/** Digits only, as wa.me requires (no +, no spaces). */
export function whatsappNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/** Full wa.me link for a phone number in any display format. */
export function whatsappHref(value: string): string {
  return `https://wa.me/${whatsappNumber(value)}`;
}

/** E.164 form (+919948618414) for structured data. */
export function e164(value: string): string {
  return `+${value.replace(/\D/g, "")}`;
}
