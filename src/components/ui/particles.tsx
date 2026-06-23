"use client";

import { useMemo } from "react";

interface ParticlesProps {
  count?: number;
  className?: string;
}

export function Particles({ count = 30, className }: ParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${seededRange(i, 11, 0, 100)}%`,
      top: `${seededRange(i, 23, 0, 100)}%`,
      size: seededRange(i, 37, 1, 4),
      delay: seededRange(i, 41, 0, 8),
      duration: seededRange(i, 53, 4, 10),
      opacity: seededRange(i, 67, 0.1, 0.5),
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className || ""}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-blue-400/30"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function seededRange(index: number, salt: number, min: number, max: number) {
  const value = Math.sin(index * 9301 + salt * 49297) * 233280;
  const fraction = value - Math.floor(value);
  return min + fraction * (max - min);
}
