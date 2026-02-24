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

    const containerClasses = cn(
        "relative inline-flex overflow-hidden rounded-xl p-[1px] group active:scale-95 transition-transform",
        primary ? "shadow-[0_0_20px_rgba(201,169,78,0.1)] hover:shadow-[0_0_30px_rgba(201,169,78,0.2)]" : "",
        className
    );

    const props: any = {
        className: containerClasses,
        ...(to ? { to } : {}),
        ...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {}),
        ...(onClick ? { onClick } : {}),
    };

    return (
        <Component {...props}>
            {/* 
        The spinning snake light wrapper. 
        It is large enough to cover the button while rotating.
        Hidden by default, shown on group-hover.
      */}
            <span className={cn(
                "absolute inset-[-1000%] animate-[spin_2.5s_linear_infinite] opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                primary
                    ? "bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#C9A94E_100%)]"
                    : "bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#A1A1AA_100%)]"
            )} />

            {/* 
        The static border (when not hovering).
      */}
            <span className={cn(
                "absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none",
                primary ? "bg-border/60" : "bg-border/30",
                "group-hover:opacity-0"
            )} />

            {/* The inner button surface */}
            <span className={cn(
                "relative z-10 w-full h-full inline-flex items-center justify-center rounded-[11px] px-8 py-4 text-base backdrop-blur-3xl transition-colors",
                primary
                    ? "bg-surface-elevated font-semibold text-text-display group-hover:bg-surface-elevated/90"
                    : "bg-surface font-medium text-text-body group-hover:text-text-display group-hover:bg-surface-elevated"
            )}>
                {children}
            </span>
        </Component>
    );
}
