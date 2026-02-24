import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol, TESTNET_TOKENS } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";
import { motion } from "motion/react";

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
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      mass: 1,
      stiffness: 100,
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
    <PageContainer>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl mx-auto"
      >
        <motion.div variants={itemVariants} className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-display mb-4">
            Dashboard
          </h1>
          <p className="text-lg text-text-caption font-light max-w-2xl leading-relaxed">
            Overview of your private portfolio — shielded token balances and liquidity positions
            stored as encrypted notes in your local vault.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Shielded Balance */}
          <motion.div variants={itemVariants}>
            <Card animated className="h-full">
              <div className="flex items-center gap-2 mb-6">
                <p className="text-sm font-semibold tracking-wide text-text-caption uppercase">Shielded Balance</p>
              </div>
              {!isInitialized ? (
                <p className="text-sm text-text-disabled font-light">Unlock vault to view balances.</p>
              ) : tokenEntries.length === 0 ? (
                <p className="text-sm text-text-disabled font-light">
                  No shielded tokens yet. Go to Shield to deposit tokens into the privacy pool.
                </p>
              ) : (
                <div className="space-y-4">
                  {tokenEntries.map(([token, amount]) => {
                    const decimals = TESTNET_TOKENS.find(
                      (t) => t.address.toLowerCase() === token.toLowerCase()
                    )?.decimals ?? 18;
                    return (
                      <div key={token} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/50">
                        <div className="flex items-center gap-3">
                          <TokenIcon address={token} size="md" />
                          <span className="text-base font-medium text-text-heading">
                            {getTokenSymbol(token)}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-text-display">
                          {formatTokenAmount(amount, decimals)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Positions */}
          <motion.div variants={itemVariants}>
            <Card animated className="h-full">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold tracking-wide text-text-caption uppercase">Shielded Positions</p>
                <Badge variant={unspentPositions.length > 0 ? "gold" : "default"}>
                  {unspentPositions.length}
                </Badge>
              </div>
              {!isInitialized ? (
                <p className="text-sm text-text-disabled font-light">Unlock vault to view positions.</p>
              ) : unspentPositions.length === 0 ? (
                <p className="text-sm text-text-disabled font-light">
                  No active positions. Add shielded liquidity on the Pool page.
                </p>
              ) : (
                <div className="space-y-3">
                  {unspentPositions.map((pos) => (
                    <div
                      key={pos.commitment}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-surface/50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-heading">
                          Range: <span className="text-gold-muted">[{pos.tickLower}, {pos.tickUpper}]</span>
                        </p>
                      </div>
                      <span className="text-sm font-medium text-text-body">
                        Liq: {pos.liquidity.toString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
}
