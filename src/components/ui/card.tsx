import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-xl border transition-all duration-300 bg-white",
  {
    variants: {
      variant: {
        default:
          "border-slate-200 shadow-sm",
        glass:
          "border-slate-200 bg-white/80 backdrop-blur-md shadow-sm",
        "glass-strong":
          "border-slate-200 bg-white/90 backdrop-blur-xl shadow-md",
        product:
          "border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 group",
      },
      radius: {
        default: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-3xl",
      },
      padding: {
        none: "p-0",
        default: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      radius: "default",
      padding: "default",
    },
  }
);

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, radius, padding, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, radius, padding, className }))}
      {...props}
    />
  );
}

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold tracking-tight text-slate-900",
        className
      )}
      {...props}
    />
  );
}

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
  );
}

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("", className)} {...props} />;
}

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn("flex items-center gap-4 pt-4", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
