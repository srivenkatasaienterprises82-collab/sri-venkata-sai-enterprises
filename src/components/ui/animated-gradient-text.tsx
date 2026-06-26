"use client";


/**
 * AnimatedGradientText — shifts hue over time for a living gradient headline.
 * Wrap any text; the gradient is applied via background-clip.
 */
export function AnimatedGradientText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`bg-gradient-to-r from-blue-600 via-indigo-500 via-50% to-purple-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient_4s_linear_infinite] ${className}`}
    >
      {children}
    </span>
  );
}
