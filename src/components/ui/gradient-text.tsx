import { cn } from "@/lib/utils";

interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "h1" | "h2" | "h3" | "p";
}

export function GradientText({
  className,
  as: Tag = "span",
  children,
  ...props
}: GradientTextProps) {
  return (
    <Tag
      className={cn("text-gradient", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
