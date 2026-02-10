import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "gold" | "error" | "success";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-elevated text-text-caption border-border",
  gold: "bg-gold/10 text-gold border-gold/20",
  error: "bg-signal-error/10 text-signal-error border-signal-error/20",
  success: "bg-signal-success/10 text-signal-success border-signal-success/20",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
