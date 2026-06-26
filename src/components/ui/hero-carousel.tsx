"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

import "swiper/css";

interface SlideImage {
  src: string;
  href?: string;
}

interface HeroCarouselProps {
  images: (string | SlideImage)[];
  className?: string;
  autoPlayInterval?: number;
}

export function HeroCarousel({ images, className = "", autoPlayInterval = 4500 }: HeroCarouselProps) {
  return (
    <Swiper
      modules={[Autoplay]}
      autoplay={{ delay: autoPlayInterval, disableOnInteraction: false, pauseOnMouseEnter: true }}
      rewind={true}
      className={className}
    >
      {images.map((item, i) => {
        const src = typeof item === "string" ? item : item.src;
        const href = typeof item === "string" ? undefined : item.href;
        const slide = (
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={`Slide ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={i === 0}
            />
          </div>
        );
        return (
          <SwiperSlide key={i}>
            {href ? (
              <Link href={href} className="block h-full w-full">
                {slide}
              </Link>
            ) : (
              slide
            )}
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
