import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

const sectionVariants = cva("relative w-full", {
  variants: {
    spacing: {
      none: "py-0",
      default: "py-20 md:py-28",
      sm: "py-12 md:py-16",
      lg: "py-24 md:py-32",
      xl: "py-28 md:py-36",
    },
    container: {
      default: "max-w-7xl mx-auto px-5 sm:px-8 md:px-10",
      sm: "max-w-6xl mx-auto px-5 sm:px-8 md:px-10",
      lg: "max-w-7xl mx-auto px-5 sm:px-10 lg:px-14",
    },
  },
  defaultVariants: {
    spacing: "default",
    container: "default",
  },
});

type SectionProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof sectionVariants> & {
    as?: React.ElementType;
    /** @deprecated No longer used — kept for API compat so callers don't break */
    initial?: unknown;
    /** @deprecated */
    whileInView?: unknown;
    /** @deprecated */
    viewport?: unknown;
    /** @deprecated */
    transition?: unknown;
  };

function Section({
  className,
  spacing,
  container,
  as: Component = "section",
  children,
  // Consume (and discard) legacy motion props so callers don't break
  initial: _initial,
  whileInView: _whileInView,
  viewport: _viewport,
  transition: _transition,
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn(sectionVariants({ spacing, container, className }))}
      {...props}
    >
      {children}
    </Component>
  );
}

Section.displayName = "Section";

export { Section, sectionVariants };