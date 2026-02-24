import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol, TESTNET_TOKENS } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";
import { motion } from "motion/react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      mass: 1.2,
      stiffness: 80,
      damping: 20,
    },
  },
};

export function Dashboard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const balances = useSdkStore((s) => s.balances);
  const unspentPositions = useSdkStore((s) => s.unspentPositions);

  const tokenEntries = Object.entries(balances).filter(([, amt]) => amt > 0n);

  return (
    <>
      <InteractiveBackground />
      <PageContainer size="wide" className="relative z-10 pt-16 pb-32">
        {/* Ambient Top Glow specific to Dashboard */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[400px] bg-gold/5 blur-[150px] rounded-full pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full relative"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="mb-14 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-text-heading to-text-caption mb-4">
                Command Center
              </h1>
              <p className="text-lg text-text-body font-light max-w-2xl leading-relaxed">
                Your zero-knowledge vault is active. Assets and positions are securely isolated from public view.
              </p>
            </div>
            {isInitialized && (
              <div className="px-6 py-3 rounded-full border border-gold/20 bg-gold/5 backdrop-blur-md inline-flex flex-col items-center md:items-end">
                <span className="text-xs font-semibold text-gold tracking-widest uppercase mb-1">Network Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-signal-success animate-pulse" />
                  <span className="text-sm text-text-display font-medium">Encrypted & Synchronized</span>
                </div>
              </div>
            )}
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Shielded Balance Widget */}
            <motion.div variants={itemVariants}>
              <Card animated className="h-full border-white/5 bg-surface/40 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-text-display">Shielded Vault</h2>
                  <Badge variant={tokenEntries.length > 0 ? "gold" : "default"} className="px-3 py-1">
                    {tokenEntries.length} Assets
                  </Badge>
                </div>

                {!isInitialized ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl">
                    <p className="text-base text-text-disabled font-light">Vault is locked. Initialize SDK to view balances.</p>
                  </div>
                ) : tokenEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl">
                    <p className="text-base text-text-disabled font-light mb-4">No shielded assets detected.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokenEntries.map(([token, amount]) => {
                      const decimals = TESTNET_TOKENS.find(
                        (t) => t.address.toLowerCase() === token.toLowerCase()
                      )?.decimals ?? 18;
                      return (
                        <div key={token} className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-surface-elevated/80 to-surface/30 border border-white/5 hover:border-gold/30 transition-all duration-300">
                          {/* Hover glow inside row */}
                          <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          <div className="relative z-10 flex items-center gap-4">
                            <div className="p-2 bg-surface rounded-xl border border-white/5 shadow-inner">
                              <TokenIcon address={token} size="lg" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xl font-bold text-text-display tracking-tight">
                                {getTokenSymbol(token)}
                              </span>
                              <span className="text-xs font-medium text-text-caption tracking-widest uppercase mt-0.5">Asset</span>
                            </div>
                          </div>
                          <div className="relative z-10 flex flex-col items-end">
                            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-text-body">
                              {formatTokenAmount(amount, decimals)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Positions Widget */}
            <motion.div variants={itemVariants}>
              <Card animated className="h-full border-white/5 bg-surface/40 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold tracking-tight text-text-display">Active Positions</h2>
                  <Badge variant={unspentPositions.length > 0 ? "gold" : "default"} className="px-3 py-1">
                    {unspentPositions.length} Positions
                  </Badge>
                </div>

                {!isInitialized ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl">
                    <p className="text-base text-text-disabled font-light">Vault is locked. Initialize SDK to view positions.</p>
                  </div>
                ) : unspentPositions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl bg-surface/20">
                    <p className="text-base text-text-disabled font-light mb-4">You have no active shielded liquidity positions.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unspentPositions.map((pos) => (
                      <div
                        key={pos.commitment}
                        className="group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-surface-elevated/80 to-surface/30 border border-white/5 hover:border-gold/30 transition-all duration-300"
                      >
                        {/* Hover glow inside row */}
                        <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative z-10 flex flex-col">
                          <span className="text-xs font-semibold text-text-caption tracking-widest uppercase mb-1">Price Range</span>
                          <p className="text-lg font-bold text-text-display tracking-tight">
                            <span className="text-gold-muted/80 mr-1">[</span>
                            {pos.tickLower} <span className="text-text-disabled mx-2">→</span> {pos.tickUpper}
                            <span className="text-gold-muted/80 ml-1">]</span>
                          </p>
                        </div>
                        <div className="relative z-10 flex flex-col sm:items-end border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                          <span className="text-xs font-semibold text-text-caption tracking-widest uppercase mb-1">Liquidity Provider</span>
                          <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-l from-white to-text-body">
                            {pos.liquidity.toString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </PageContainer>
    </>
  );
}
