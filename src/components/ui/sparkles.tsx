"use client";

import { useEffect, useState } from "react";

/**
 * Sparkles — floating sparkle dots around children.
 * Uses useState+useEffect to avoid SSR hydration mismatch from Math.random().
 */
export function Sparkles({
  children,
  className = "",
  count = 6,
}: {
  children: React.ReactNode;
  className?: string;
  count?: number;
}) {
  const [sparkles, setSparkles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number }[]
  >([]);

  useEffect(() => {
    setSparkles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1.5,
        delay: Math.random() * 2,
        duration: Math.random() * 1.5 + 1,
      }))
    );
  }, [count]);

  return (
    <span className={`relative inline-block ${className}`}>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="pointer-events-none absolute rounded-full bg-amber-400 animate-[pulse_var(--tw-animate-duration)_var(--tw-animate-delay)_infinite_ease-in-out]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            "--tw-animate-duration": `${s.duration}s`,
            "--tw-animate-delay": `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
      {children}
    </span>
  );
}
