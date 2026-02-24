import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { DepositCard } from "@/components/features/shield/DepositCard";
import { WithdrawCard } from "@/components/features/shield/WithdrawCard";
import { NoteHistory } from "@/components/features/shield/NoteHistory";
import { motion } from "motion/react";

const tabs = [
  { value: "deposit", label: "Shield" },
  { value: "withdraw", label: "Unshield" },
];

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

export function ShieldPage() {
  const [activeTab, setActiveTab] = useState("deposit");

  return (
    <PageContainer size="narrow">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-text-display">
            Shield / Unshield
          </h1>
          <p className="text-text-caption max-w-lg mx-auto leading-relaxed">
            Shield tokens to register private commitments in the Zylith privacy pool.
            Unshield to reveal and withdraw tokens back to your public wallet.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-center">
          <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />
        </motion.div>

        <motion.div variants={itemVariants}>
          {activeTab === "deposit" ? <DepositCard /> : <WithdrawCard />}
        </motion.div>

        <motion.div variants={itemVariants}>
          <NoteHistory />
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}
