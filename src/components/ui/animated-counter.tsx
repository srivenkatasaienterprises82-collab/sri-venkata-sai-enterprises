"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 2000,
  className,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}
