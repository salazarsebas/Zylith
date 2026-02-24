import { Link } from "react-router";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { motion } from "motion/react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

const features = [
  {
    title: "Shielded Swaps",
    description:
      "Swap tokens privately using zero-knowledge proofs. No one can see what you trade or how much.",
  },
  {
    title: "Concentrated Liquidity",
    description:
      "Provide liquidity in custom price ranges for maximum capital efficiency, all within the privacy pool.",
  },
  {
    title: "Zero-Knowledge Proofs",
    description:
      "Groth16 proofs verified on-chain via Garaga BN254 pairing. Your transactions are mathematically private.",
  },
  {
    title: "Built on Starknet",
    description:
      "Cairo smart contracts with Poseidon commitments, Merkle trees, and battle-tested cryptographic primitives.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom ease-out curve
    },
  },
};

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden">
      <InteractiveBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6"
        >
          <span className="text-lg font-semibold text-text-display tracking-tight">
            Zylith
          </span>
          <Link
            to="/app"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-body transition-all hover:border-gold/30 hover:text-text-heading hover:shadow-[0_0_15px_rgba(201,169,78,0.1)]"
          >
            Launch App
          </Link>
        </motion.nav>

        {/* Hero */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl px-6 pt-24 pb-20 text-center flex-1"
        >
          <motion.div variants={itemVariants} className="mb-6 flex justify-center">
            <motion.div
              whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <ShieldIcon size={40} className="text-gold" />
            </motion.div>
          </motion.div>
          <motion.h1 variants={itemVariants} className="text-5xl font-semibold text-text-display tracking-tight leading-[1.15] md:text-6xl">
            Shielded Liquidity
            <br />
            <span className="text-gold">for Bitcoin on Starknet</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-lg text-lg text-text-body leading-relaxed">
            The first concentrated liquidity market maker with zero-knowledge
            privacy. Swap, provide liquidity, and earn fees — all shielded.
          </motion.p>
          <motion.div variants={itemVariants} className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/app"
              className="inline-flex items-center rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-canvas transition-all hover:bg-gold-muted hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(201,169,78,0.3)]"
            >
              Launch App
            </Link>
            <a
              href="https://github.com/zylith-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-body transition-all hover:border-text-caption hover:text-text-heading hover:bg-surface-elevated/50"
            >
              GitHub
            </a>
          </motion.div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto w-full max-w-5xl px-6 pb-24"
        >
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -5, borderColor: "rgba(201, 169, 78, 0.3)" }}
                className="rounded-lg border border-border bg-surface p-6 transition-colors duration-300"
              >
                <h3 className="text-base font-medium text-text-heading">{f.title}</h3>
                <p className="mt-2 text-sm text-text-caption leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center text-sm text-text-caption w-full">
          Zylith Protocol — Shielded CLMM for Bitcoin on Starknet
        </footer>
      </div>
    </div>
  );
}
