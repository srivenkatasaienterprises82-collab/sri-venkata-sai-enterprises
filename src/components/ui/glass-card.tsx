"use client";

import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps, type MotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  float?: boolean;
  floatDelay?: number;
  motionProps?: MotionProps;
}

export function GlassCard({
  className,
  float = false,
  floatDelay = 0,
  children,
  motionProps,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-[24px] border border-slate-200 bg-white/70 px-5 py-4 backdrop-blur-[40px] shadow-sm",
        className
      )}
      initial={motionProps?.initial}
      animate={
        float
          ? {
              ...(typeof motionProps?.animate === "object" ? motionProps.animate : {}),
              y: [0, -12, 0],
            }
          : motionProps?.animate
      }
      transition={
        float
          ? {
              ...(typeof motionProps?.transition === "object" ? motionProps.transition : {}),
              y: {
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: floatDelay,
              },
            }
          : motionProps?.transition
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
