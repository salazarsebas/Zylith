import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LiquidityDepthChart } from "@/components/features/charts/LiquidityDepthChart";
import { usePoolState } from "@/hooks/usePoolState";
import { TESTNET_TOKENS } from "@/config/tokens";
import { FEE_TIERS } from "@zylith/sdk";
import type { PoolKey } from "@zylith/sdk";
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

export function PoolBrowser() {
  // Fixed pool: STRK/ETH with 0.3% fee
  const token0 = TESTNET_TOKENS.find(t => t.symbol === "STRK")!;
  const token1 = TESTNET_TOKENS.find(t => t.symbol === "ETH")!;

  const poolKey: PoolKey = {
    token0: token0.address,
    token1: token1.address,
    fee: FEE_TIERS.MEDIUM.fee,
    tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
  };

  const { data: poolState, isLoading: poolLoading } = usePoolState(poolKey);
  const isEmpty = poolState && poolState.liquidity === 0n;

  return (
    <PageContainer size="wide">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold tracking-tight text-text-display">
            {token0.symbol}/{token1.symbol} Pool
          </h1>
          <p className="mt-2 text-text-caption leading-relaxed">
            View pool statistics and liquidity status. To add liquidity or swap, use the Swap page.
          </p>
        </motion.div>

        {/* Pool Status Card */}
        <motion.div variants={itemVariants}>
          <div className="relative group overflow-hidden rounded-[24px] p-[1px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/5 w-full">
            <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#c9a84c_100%)] pointer-events-none" />
            <span className="absolute inset-0 rounded-[24px] border border-white/5 transition-opacity duration-300 pointer-events-none group-hover:opacity-0" />

            <div className="relative z-10 bg-[#0a0a0c] backdrop-blur-xl p-6 sm:p-8 rounded-[23px] w-full h-full flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <h2 className="text-xl font-bold tracking-tight text-text-display">Pool Status</h2>
                <Badge variant="default" className="text-xs bg-surface-elevated/80 border border-white/5 text-gold">
                  Fee: 0.30%
                </Badge>
              </div>

              {poolLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-text-disabled">Loading pool information...</p>
                </div>
              ) : poolState ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                      <p className="text-xs font-semibold tracking-widest text-text-caption uppercase">Current Tick</p>
                      <p className="text-2xl font-bold text-text-display">{poolState.tick}</p>
                    </div>
                    <div className="space-y-1 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                      <p className="text-xs font-semibold tracking-widest text-text-caption uppercase">Total Liquidity</p>
                      <p className="text-2xl font-bold text-text-display font-mono">
                        {poolState.liquidity.toString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-elevated/50 p-4">
                    <span className="text-sm font-semibold tracking-widest uppercase text-text-caption">Status</span>
                    <Badge variant={poolState.liquidity > 0n ? "success" : "default"} className={poolState.liquidity > 0n ? "bg-signal-success/20 text-signal-success border-signal-success/30" : "bg-white/5 text-text-caption border-white/10"}>
                      {poolState.liquidity > 0n ? "Active & Ready" : "Empty"}
                    </Badge>
                  </div>

                  {isEmpty && (
                    <div className="rounded-xl border border-signal-warning/30 bg-signal-warning/10 p-5 mt-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-signal-warning/10 p-2">
                          <svg className="w-4 h-4 text-signal-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-signal-warning">
                            This pool has no liquidity yet
                          </p>
                          <p className="text-xs text-text-caption">
                            The pool needs liquidity before you can swap. An admin will add initial liquidity.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {poolState.liquidity > 0n && (
                    <div className="rounded-xl border border-signal-success/30 bg-signal-success/10 p-5 mt-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-signal-success/10 p-2">
                          <svg className="w-4 h-4 text-signal-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-signal-success">
                            Pool is active and ready for swaps
                          </p>
                          <p className="text-xs text-text-caption">
                            You can now shield tokens and make private swaps.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {poolState.liquidity > 0n && (
                    <div className="mt-6">
                      <LiquidityDepthChart poolState={poolState} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-text-disabled">
                    Pool not initialized or unavailable.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          {poolState && poolState.liquidity > 0n && (
            <Card className="space-y-4 bg-transparent border-none p-0 mt-8 shadow-none">
              <h2 className="text-base font-medium text-text-heading">Next Steps</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-body">Shield Your Tokens</p>
                    <p className="text-xs text-text-caption mt-1">
                      Go to the Shield page to deposit {token0.symbol} or {token1.symbol} and get a private note.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-body">Make Private Swaps</p>
                    <p className="text-xs text-text-caption mt-1">
                      Use the Swap page to trade privately using your shielded tokens with zero-knowledge proofs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-body">Withdraw Anytime</p>
                    <p className="text-xs text-text-caption mt-1">
                      Return to Shield page to withdraw your tokens back to your wallet when you're done.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}
