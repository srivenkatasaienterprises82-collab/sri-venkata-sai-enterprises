"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Infinite scrolling brand logo carousel.
 * Logs auto-duplicate for seamless looping; pauses on hover.
 * Edge gradients fade logos in/out at viewport edges.
 */

interface BrandLogo {
  name: string;
  /** Path relative to /public, e.g. "/images/brand-logos/samsung logo.png" */
  src: string;
  /** Optional href — wraps logo in a link */
  href?: string;
}

/**
 * Swap these paths with your actual logo files in /public/images/brand-logos/.
 * Images should be ~200×60 px PNG/WebP with transparent backgrounds.
 */
const BRAND_LOGOS: BrandLogo[] = [
  { name: "Apple",    src: "/images/brand-logos/apple logo.png" },
  { name: "Samsung",  src: "/images/brand-logos/samsung logo.png" },
  { name: "OnePlus",  src: "/images/brand-logos/onplus logo.jpg" },
  { name: "OPPO",     src: "/images/brand-logos/oppo logo.png" },
  { name: "Realme",   src: "/images/brand-logos/realme logo.png" },
  { name: "Vivo",     src: "/images/brand-logos/vivo logo.png" },
  { name: "Xiaomi",   src: "/images/brand-logos/redmi logo.png" },
  { name: "Motorola", src: "/images/brand-logos/moto logo.png" },
  { name: "iQOO",     src: "/images/brand-logos/iqoo logo.png" },
  { name: "Nothing",  src: "/images/brand-logos/nothing logo.png" },
  { name: "POCO",     src: "/images/brand-logos/poco logo.png" },
  { name: "Infinix",  src: "/images/brand-logos/infinix logo.png" },
];

/**
 * Single logo slide — renders the image at a fixed size.
 * Adjust width/height to match your logo aspect ratio.
 */
function LogoSlide({ logo }: { logo: BrandLogo }) {
  const inner = (
    <span className="flex h-12 w-36 shrink-0 items-center justify-center px-4">
      <Image
        src={logo.src}
        alt={`${logo.name} logo`}
        width={144}
        height={48}
        className="max-h-10 w-auto object-contain opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
        draggable={false}
      />
    </span>
  );

  return logo.href ? (
    <Link href={logo.href} aria-label={`Visit ${logo.name}`}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

/**
 * BrandCarousel — infinite horizontal marquee with gradient masks.
 *
 * How it works:
 * 1. The track contains TWO identical sets of logos side by side.
 * 2. CSS `translateX(-50%)` scrolls the entire track from 0 to -50%,
 *    which is visually identical to scrolling one full set.
 * 3. On hover, the animation pauses smoothly via animation-play-state.
 */
export function BrandCarousel() {
  // Duplicate the array so the track loops seamlessly
  const logos = [...BRAND_LOGOS, ...BRAND_LOGOS];

  return (
    <section
      className="relative w-full overflow-hidden bg-white py-8"
      aria-label="Brand partners"
    >
      {/* ── Header (optional) ── */}
      <div className="mx-auto mb-6 max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400">
          Trusted Brands We Carry
        </h2>
      </div>

      {/* ── Gradient masks (fade in / fade out) ── */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />

      {/* ── Scrolling track ── */}
      <div className="group relative flex w-full overflow-hidden">
        {/*
          The track is a flex row holding ALL logos (duplicated).
          `animate-marquee` moves it from 0 → -50%.
          `group-hover:pause` pauses on hover.
        */}
        <div className="pause-on-hover flex w-max animate-marquee">
          {logos.map((logo, i) => (
            <LogoSlide key={`${logo.name}-${i}`} logo={logo} />
          ))}
        </div>
      </div>
    </section>
  );
}
