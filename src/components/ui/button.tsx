import {
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-base font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.98]",
        secondary:
          "border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]",
        ghost:
          "text-slate-600 bg-transparent hover:text-slate-900 hover:bg-slate-100",
        outline:
          "border border-blue-600 text-blue-600 hover:bg-blue-50",
        whatsapp:
          "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-11 px-4 text-sm",
        lg: "h-14 px-8",
        xl: "h-16 px-10 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonOwnProps = VariantProps<typeof buttonVariants>;

type ButtonProps = ComponentPropsWithoutRef<"button"> &
  ComponentPropsWithoutRef<"a"> &
  ButtonOwnProps & {
    as?: ElementType;
  };

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      as: Tag = "button",
      ...props
    },
    ref
  ) => {
    const rootClassName = cn(buttonVariants({ variant, size, className }));

    return (
      <Tag
        ref={ref}
        className={rootClassName}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export type { ButtonProps };
export { Button, buttonVariants };