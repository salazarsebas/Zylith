import { PageContainer } from "@/components/layout/PageContainer";
import { AddLiquidityCard } from "@/components/features/liquidity/AddLiquidityCard";
import { BalanceDisplay } from "@/components/features/shared/BalanceDisplay";
import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
};

export function LiquidityPage() {
  return (
    <PageContainer size="narrow">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 w-full flex flex-col items-center"
      >
        <motion.div variants={itemVariants} className="text-center w-full">
          <h1 className="text-3xl font-bold tracking-tight text-text-display mb-2">Add Liquidity</h1>
          <p className="text-text-caption leading-relaxed max-w-md mx-auto">
            Become a private liquidity provider. Add liquidity using your shielded notes and earn fees without revealing your position size.
          </p>
        </motion.div>

        <div className="w-full space-y-6 mt-8">
          <motion.div variants={itemVariants} className="w-full">
            <AddLiquidityCard />
          </motion.div>
          <motion.div variants={itemVariants} className="w-full">
            <BalanceDisplay />
          </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
}
