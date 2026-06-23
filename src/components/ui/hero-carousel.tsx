"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  images: string[];
  autoPlayInterval?: number;
  className?: string;
}

export function HeroCarousel({
  images,
  autoPlayInterval = 4000,
  className
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Respect the user's motion preference — pause auto-play when reduced.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);

    const timer = setTimeout(() => {
      setReducedMotion(mq.matches);
    }, 0);

    return () => {
      mq.removeEventListener("change", onChange);
      clearTimeout(timer);
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  }, [images.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  }, [images.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    // Pause auto-play while hovered or when the user prefers reduced motion.
    if (isHovered || reducedMotion) return;
    const interval = setInterval(() => {
      nextSlide();
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isHovered, reducedMotion, nextSlide, autoPlayInterval]);

  if (!images || images.length === 0) return null;

  return (
    <div
      className={cn("relative w-full overflow-hidden group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products slideshow"
    >
      {/* Slides Container */}
      <div 
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${(currentIndex / images.length) * 100}%)` }}
      >
        {images.map((imgSrc, index) => (
          <div key={index} className="min-w-full h-full relative">
            <Image
              src={imgSrc}
              alt={`Slide ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
            {/* Subtle gradient overlay to make arrows and dots stand out better if images are bright */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md opacity-0 transition-all duration-300 hover:bg-white/40 hover:scale-110 focus:opacity-100 group-hover:opacity-100 sm:left-6"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md opacity-0 transition-all duration-300 hover:bg-white/40 hover:scale-110 focus:opacity-100 group-hover:opacity-100 sm:right-6"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300 shadow-sm",
              currentIndex === index 
                ? "w-8 bg-white" 
                : "w-2 bg-white/50 hover:bg-white/80"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
