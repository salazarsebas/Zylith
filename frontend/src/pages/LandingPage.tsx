import { Link } from "react-router";
import { motion } from "motion/react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";
import { GlowingCard } from "@/components/ui/GlowingCard";
import { SnakeButton } from "@/components/ui/SnakeButton";

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
      ease: [0.25, 0.46, 0.45, 0.94],
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
          className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-text-display tracking-tight border-b-2 border-gold/50 pb-0.5">
              Zylith
            </span>
          </div>
          <Link
            to="/app"
            className="rounded-lg border border-border bg-surface/50 backdrop-blur-md px-5 py-2.5 text-sm font-medium text-text-body transition-all hover:bg-surface-elevated hover:border-gold/40 hover:text-text-heading hover:shadow-[0_0_20px_rgba(201,169,78,0.15)]"
          >
            Launch App
          </Link>
        </motion.nav>

        {/* Hero */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl px-6 pt-32 pb-24 text-center flex-1 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] bg-gold/5 blur-[120px] rounded-full point-events-none" />

          <motion.h1 variants={itemVariants} className="text-7xl md:text-8xl font-bold tracking-tighter leading-[1.05]">
            <span className="text-text-display">Shielded Liquidity</span>
            <br />
            <span className="bg-gradient-to-r from-gold via-gold-muted to-gold-dim bg-clip-text text-transparent">
              for Starknet
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="mx-auto mt-10 max-w-2xl text-xl text-text-body leading-relaxed font-light">
            The concentrated liquidity market maker with zero-knowledge
            privacy. Swap, provide liquidity, and earn fees — entirely shielded.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-14 flex flex-wrap items-center justify-center gap-5">
            <SnakeButton to="/app" primary className="min-w-[200px]">
              Start Trading
            </SnakeButton>

            <SnakeButton href="https://github.com/zylith-protocol" className="min-w-[200px]">
              View GitHub
            </SnakeButton>
          </motion.div>
        </motion.section>

        {/* Bento Grid Features - PURE TYPOGRAPHY */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto w-full max-w-6xl px-6 pb-32"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-min">

            {/* Large Card (2 cols) */}
            <GlowingCard variants={itemVariants} className="md:col-span-2 p-10">
              <h3 className="text-3xl font-bold tracking-tight text-text-display mb-4">Shielded Swaps</h3>
              <p className="text-lg text-text-caption max-w-lg leading-relaxed font-light">
                Swap tokens privately using zero-knowledge proofs. Transaction volume and timing remain completely hidden from public observers.
              </p>
            </GlowingCard>

            {/* Standard Card (1 col) */}
            <GlowingCard variants={itemVariants} className="p-10">
              <h3 className="text-2xl font-bold tracking-tight text-text-display mb-4">Concentrated Liquidity</h3>
              <p className="text-base text-text-caption leading-relaxed font-light">
                Deploy capital in custom price ranges for maximum efficiency within the privacy pool.
              </p>
            </GlowingCard>

            {/* Standard Card (1 col) */}
            <GlowingCard variants={itemVariants} className="p-10">
              <h3 className="text-2xl font-bold tracking-tight text-text-display mb-4">Mathematical Privacy</h3>
              <p className="text-base text-text-caption leading-relaxed font-light">
                Groth16 proofs verified on-chain via Garaga BN254 pairing ensure unbreakable guarantees.
              </p>
            </GlowingCard>

            {/* Wide Card (2 cols) */}
            <GlowingCard variants={itemVariants} className="md:col-span-2 p-10">
              <h3 className="text-3xl font-bold tracking-tight text-text-display mb-4">Cairo Architecture</h3>
              <p className="text-lg text-text-caption max-w-lg leading-relaxed font-light">
                Built on Starknet. Leveraging heavily optimized smart contracts with Poseidon commitments and highly-efficient Merkle trees.
              </p>
            </GlowingCard>

          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="border-t border-border/50 bg-surface/30 backdrop-blur-md py-10 text-center w-full"
        >
          <p className="text-sm font-medium tracking-wide text-text-caption">
            Zylith Protocol
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
