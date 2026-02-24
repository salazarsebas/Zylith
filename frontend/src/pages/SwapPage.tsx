import { PageContainer } from "@/components/layout/PageContainer";
import { SwapCard } from "@/components/features/swap/SwapCard";
import { motion } from "motion/react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", mass: 1.2, stiffness: 80, damping: 20 },
  },
};

export function SwapPage() {
  return (
    <>
      <InteractiveBackground />
      <PageContainer size="narrow" className="relative z-10 pt-16 pb-32">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[400px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full relative flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="mb-10 text-center w-full">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-text-heading to-text-caption mb-4">
              Swap Exchange
            </h1>
            <p className="text-lg text-text-body font-light max-w-md mx-auto leading-relaxed">
              Trade tokens seamlessly. Use Shielded Mode for complete zero-knowledge privacy.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full">
            <SwapCard />
          </motion.div>
        </motion.div>
      </PageContainer>
    </>
  );
}
