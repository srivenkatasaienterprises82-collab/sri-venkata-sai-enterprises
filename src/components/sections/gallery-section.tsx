"use client";

import Image from "next/image";
import { Section } from "@/components/layout/section";
import { GradientText } from "@/components/ui/gradient-text";

export interface GalleryItem {
  id: string;
  image: string;
  caption: string;
}

const staticPhotos: GalleryItem[] = [
  {
    id: "g1",
    image: "/images/brand-logos/oppo logo.png",
    caption: "Authorized Partner Store",
  },
  {
    id: "g2",
    image: "/images/brand-logos/vivo logo.png",
    caption: "Wide Range of Smartphones",
  },
  {
    id: "g3",
    image: "/images/brand-logos/samsung logo.png",
    caption: "Live Demo Counter",
  },
];

export function GallerySection({ items }: { items?: GalleryItem[] }) {
  const displayPhotos = items && items.length > 0 ? items : staticPhotos;

  return (
    <Section className="bg-slate-50 border-t border-slate-200" spacing="lg">
      <div className="text-center mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2 block">
          Inside Our Store
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Visit <GradientText>Our Store</GradientText>
        </h2>
        <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm font-medium">
          Walk in today to experience live demo units, get official support, and receive personal assistance.
        </p>
      </div>

      <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {displayPhotos.map((photo) => (
          <div
            key={photo.id}
            className="group relative h-64 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
          >
            <Image
              src={photo.image}
              alt={photo.caption || "Store photo"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-5 pt-10">
                <p className="text-sm font-semibold text-white tracking-wide">
                  {photo.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

export default GallerySection;