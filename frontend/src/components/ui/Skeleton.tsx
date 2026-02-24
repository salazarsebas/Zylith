import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "text" | "card" | "circle" | "button";
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Reusable loading skeleton component with different variants.
 * Provides smooth pulsing animation matching the Obsidian Core design system.
 */
export function Skeleton({
  variant = "text",
  className,
  width,
  height,
}: SkeletonProps) {
  const baseStyles =
    "animate-pulse bg-gradient-to-r from-surface-elevated via-border to-surface-elevated bg-[length:200%_100%] animate-[shimmer_2s_infinite]";

  const variantStyles = {
    text: "h-4 rounded",
    card: "h-32 rounded-xl",
    circle: "rounded-full",
    button: "h-10 rounded-lg",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
    />
  );
}

/**
 * Specialized skeleton for text content with multiple lines.
 */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

/**
 * Specialized skeleton for card content.
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-surface-elevated/30 p-6",
        className
      )}
    >
      <Skeleton variant="text" className="w-1/3 mb-4" />
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-4/6" />
      </div>
    </div>
  );
}
