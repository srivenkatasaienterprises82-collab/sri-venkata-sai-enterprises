"use client";


/**
 * BorderBeam — animated gradient border that rotates around a card.
 * Wrap any card; the beam renders as a pseudo-border via absolutely-positioned divs.
 */
export function BorderBeam({
  children,
  className = "",
  duration = 4,
  colors,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  colors?: [string, string];
}) {
  const [c1, c2] = colors ?? ["#2563EB", "#7C3AED"];

  return (
    <div className={`relative ${className}`}>
      {/* Rotating gradient border */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 animate-[spin_4s_linear_infinite]"
        style={{
          background: `conic-gradient(from 0deg, ${c1}, ${c2}, transparent 40%, transparent 60%, ${c2}, ${c1})`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          padding: "1.5px",
        }}
      />
      {children}
    </div>
  );
}
