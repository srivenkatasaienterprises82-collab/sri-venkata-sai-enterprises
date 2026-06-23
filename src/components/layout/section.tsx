"use client";

import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { motion, type MotionProps } from "framer-motion";
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

type SectionOwnProps = VariantProps<typeof sectionVariants> & MotionProps & {
  as?: React.ElementType;
};

type SectionProps = Omit<React.HTMLAttributes<HTMLElement>, "as"> & SectionOwnProps;

function Section({
  className,
  spacing,
  container,
  as = "section",
  children,
  initial,
  whileInView,
  viewport,
  transition,
  ...props
}: SectionProps) {
  const classNameValue = cn(sectionVariants({ spacing, container, className }));
  const initialValue = initial ?? { opacity: 0, y: 28 };
  const whileInViewValue = whileInView ?? { opacity: 1, y: 0 };
  const viewportValue = viewport ?? { once: true, amount: 0.18, margin: "-60px" };
  const transitionValue = transition ?? { duration: 0.55, ease: "easeOut" };

  const Component = motion[as as keyof typeof motion] as React.ComponentType<
    MotionProps & React.HTMLAttributes<HTMLElement>
  >;

  return (
    <Component
      className={classNameValue}
      initial={initialValue}
      whileInView={whileInViewValue}
      viewport={viewportValue}
      transition={transitionValue}
      {...props}
    >
      {children}
    </Component>
  );
}

Section.displayName = "Section";

export { Section, sectionVariants };