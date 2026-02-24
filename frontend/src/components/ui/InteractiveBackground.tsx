import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

export function InteractiveBackground() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isMounted, setIsMounted] = useState(false);

    // Softer spring for a fluid "trailing flashlight" effect
    const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
    const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });

    useEffect(() => {
        setIsMounted(true);
        function handleMouseMove({ clientX, clientY }: MouseEvent) {
            mouseX.set(clientX);
            mouseY.set(clientY);
        }
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-canvas">

            {/* 1. Animated Ambient Orbs (Aurora effect) */}
            <div className="absolute inset-0 opacity-40 mix-blend-screen overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 100, -100, 0],
                        y: [0, -50, 50, 0],
                        scale: [1, 1.2, 0.8, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] h-[50vh] w-[50vw] rounded-full bg-gold/10 blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 100, 0],
                        y: [0, 100, -100, 0],
                        scale: [1, 0.9, 1.1, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-[40%] left-[60%] h-[60vh] w-[40vw] rounded-full bg-text-disabled/10 blur-[120px]"
                />
            </div>

            {/* 2. Base Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: `
            linear-gradient(to right, var(--color-text-body) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-text-body) 1px, transparent 1px)
          `,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* 3. Interactive Ambient Glow */}
            {isMounted && (
                <motion.div
                    className="absolute inset-0 z-10 transition-opacity duration-300"
                    style={{
                        background: useMotionTemplate`
              radial-gradient(
                600px circle at ${smoothX}px ${smoothY}px,
                rgba(201, 169, 78, 0.08),
                transparent 80%
              )
            `,
                    }}
                />
            )}

            {/* 4. Interactive Spotlight Grid Mask (Reveals a glowing grid on hover) */}
            {isMounted && (
                <motion.div
                    className="absolute inset-0 z-10"
                    style={{
                        backgroundImage: `
              linear-gradient(to right, rgba(201, 169, 78, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(201, 169, 78, 0.4) 1px, transparent 1px)
            `,
                        backgroundSize: '40px 40px',
                        WebkitMaskImage: useMotionTemplate`
              radial-gradient(
                250px circle at ${smoothX}px ${smoothY}px,
                black,
                transparent 80%
              )
            `,
                        maskImage: useMotionTemplate`
              radial-gradient(
                250px circle at ${smoothX}px ${smoothY}px,
                black,
                transparent 80%
              )
            `,
                    }}
                />
            )}

            {/* Vignette overlay for depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--color-canvas)_100%)] opacity-80" />
        </div>
    );
}
