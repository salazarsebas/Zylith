import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Link } from "react-router";

interface SnakeButtonProps {
    children: ReactNode;
    className?: string;
    href?: string;
    to?: string;
    onClick?: () => void;
    primary?: boolean;
}

export function SnakeButton({
    children,
    className,
    href,
    to,
    onClick,
    primary = false,
}: SnakeButtonProps) {
    const Component = to ? Link : href ? "a" : "button";

    const baseClasses = cn(
        "relative inline-flex overflow-hidden rounded-xl p-[1px] group transition-transform active:scale-95",
        // Primary has a subtle glow already, secondary is flat
        primary ? "shadow-[0_0_20px_rgba(201,169,78,0.1)] hover:shadow-[0_0_30px_rgba(201,169,78,0.2)]" : "",
        className
    );

    const props: any = {
        className: baseClasses,
        ...(to ? { to } : {}),
        ...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {}),
        ...(onClick ? { onClick } : {}),
    };

    return (
        <Component {...props}>
            {/* The static border (when not hovering) */}
            <span className={cn(
                "absolute inset-0 rounded-xl transition-opacity duration-300",
                primary ? "bg-border/80" : "bg-border/50",
                "group-hover:opacity-0"
            )} />

            {/* The spinning snake light (visible on hover) */}
            <span className={cn(
                "absolute inset-[-1000%] animate-border-spin opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                "bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,var(--color-gold)_50%,transparent_100%)]"
            )} />

            {/* The inner button surface */}
            <span className={cn(
                "relative z-10 inline-flex h-full w-full items-center justify-center rounded-xl px-8 py-4 text-base backdrop-blur-xl transition-colors",
                primary
                    ? "bg-surface-elevated font-semibold text-text-display group-hover:bg-surface"
                    : "bg-surface/50 font-medium text-text-body group-hover:text-text-display group-hover:bg-surface-elevated/80"
            )}>
                {children}
            </span>
        </Component>
    );
}
