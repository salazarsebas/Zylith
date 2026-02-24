import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

export function InteractiveBackground() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth the mouse movement slightly for a less jittery, more fluid "trail" feel
    const smoothX = useSpring(mouseX, { damping: 40, stiffness: 200 });
    const smoothY = useSpring(mouseY, { damping: 40, stiffness: 200 });

    useEffect(() => {
        function handleMouseMove({ clientX, clientY }: MouseEvent) {
            mouseX.set(clientX);
            mouseY.set(clientY);
        }
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            {/* 
        Subtle radial gradient that follows the mouse cursor.
        Reduced opacity and size to keep it premium and not distracting.
      */}
            <motion.div
                className="absolute inset-0 z-0 transition-opacity duration-300"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              600px circle at ${smoothX}px ${smoothY}px,
              rgba(201, 169, 78, 0.05),
              transparent 80%
            )
          `,
                }}
            />
            {/* 
        Optional: A very faint static grain/texture or a very subtle secondary gradient
        can be added here to add depth to the canvas if needed.
      */}
            <div className="absolute inset-0 bg-canvas/30 backdrop-blur-[1px]" />
        </div>
    );
}
