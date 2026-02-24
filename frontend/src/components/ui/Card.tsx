import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  noPadding?: boolean;
  animated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ elevated, noPadding, animated, className, children, ...props }, ref) => {

    // Static base wrapper to enforce corner radiuses regardless of animated state
    if (!animated) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-2xl border border-border",
            elevated ? "bg-surface-elevated" : "bg-surface",
            !noPadding && "p-8",
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    // Animated container using the SnakeButton design logic
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-2xl p-[1px] group transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-gold/10",
          className
        )}
        {...props}
      >
        {/* Spinning background gradient tail */}
        <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#A1A1AA_100%)]" />

        {/* Static border (when not hovering) */}
        <span className={cn(
          "absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none",
          "bg-border/30",
          "group-hover:opacity-0"
        )} />

        {/* Solid opaque inner body mask */}
        <div className={cn(
          "relative z-10 w-full h-full flex flex-col rounded-[15px] transition-colors",
          !noPadding && "p-8",
          elevated
            ? "bg-[#18181B] group-hover:bg-[#18181B]"
            : "bg-[#111113] group-hover:bg-[#18181B]"
        )}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";
