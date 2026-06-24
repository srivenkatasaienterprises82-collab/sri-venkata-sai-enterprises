"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    id: 1,
    src: "/images/promo-banner/promo-1.png",
    alt: "Promotional Banner 1",
    href: "/products",
  },
  {
    id: 2,
    src: "/images/promo-banner/promo-2.png",
    alt: "Promotional Banner 2",
    href: "/products",
  },
  {
    id: 3,
    src: "/images/promo-banner/promo-3.png",
    alt: "Promotional Banner 3",
    href: "/products",
  },
  {
    id: 4,
    src: "/images/promo-banner/promo-4.png",
    alt: "Promotional Banner 4",
    href: "/products",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

export function PromoBannerGrid() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6"
        >
          {cards.map((card) => (
            <motion.div key={card.id} variants={cardVariants}>
              <Link
                href={card.href}
                className="group block overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/60 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1"
              >
                <Image
                  src={card.src}
                  alt={card.alt}
                  width={800}
                  height={500}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="h-auto w-full object-contain"
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default PromoBannerGrid;
