import { HTMLMotionProps, motion, useMotionTemplate, useMotionValue } from "motion/react";
import React from "react";
import clsx from "clsx";

interface GlowingCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    glowColor?: string; // e.g. "rgba(201, 169, 78, 0.4)"
}

export function GlowingCard({ children, className, glowColor = "rgba(201, 169, 78, 0.15)", ...props }: GlowingCardProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: React.MouseEvent<HTMLDivElement>) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            className={clsx(
                "group relative flex flex-col rounded-2xl border border-border bg-surface-elevated/40 backdrop-blur-md overflow-hidden transition-colors hover:border-border-subtle",
                className
            )}
            onMouseMove={handleMouseMove}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            {...props}
        >
            {/* Interactive hover glow bounded to the card */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
                }}
            />

            {/* Content wrapper */}
            <div className="relative z-10 flex h-full flex-col p-8">
                {children}
            </div>
        </motion.div>
    );
}

