"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  float?: boolean;
  floatDelay?: number;
}

export function GlassCard({
  className,
  float = false,
  floatDelay = 0,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-slate-200 bg-white/70 px-5 py-4 backdrop-blur-[40px] shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
