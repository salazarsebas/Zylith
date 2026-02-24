import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { PositionFeesCard } from "@/components/features/liquidity/PositionFeesCard";
import { PriceRangeChart } from "@/components/features/charts/PriceRangeChart";
import { useBurn } from "@/hooks/useBurn";
import { usePoolState } from "@/hooks/usePoolState";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { TESTNET_TOKENS } from "@/config/tokens";
import { getPositionStatusText, getPositionStatusVariant } from "@/lib/positionStatus";
import { FEE_TIERS, getAmountsForBurn } from "@zylith/sdk";
import type { PositionNote, PoolKey } from "@zylith/sdk";
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

export function PositionsPage() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const positions = useSdkStore((s) => s.unspentPositions);
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const [burnTarget, setBurnTarget] = useState<PositionNote | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const burn = useBurn();
  const { toast } = useToast();

  // Get pool state for price range chart
  const token0 = TESTNET_TOKENS[0];
  const token1 = TESTNET_TOKENS[1];
  const poolKey: PoolKey | null = token0 && token1 ? {
    token0: BigInt(token0.address) < BigInt(token1.address) ? token0.address : token1.address,
    token1: BigInt(token0.address) < BigInt(token1.address) ? token1.address : token0.address,
    fee: FEE_TIERS.MEDIUM.fee,
    tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
  } : null;
  const { data: poolState } = usePoolState(poolKey);

  const handleSync = async () => {
    if (!client) return;
    setIsSyncing(true);
    try {
      const commitments = positions.map((p) => p.commitment);
      console.log("[Sync] Syncing commitments:", commitments);

      const aspClient = (client as any).asp;
      const syncData = await aspClient.syncCommitments(commitments);
      console.log("[Sync] ASP response:", syncData);

      const noteManager = client.getNoteManager();
      noteManager.updateLeafIndexes(syncData);

      await client.saveNotes();
      refreshBalances();

      // Count how many got updated
      const updatedCount = syncData.filter((d: any) => d.leaf_index !== null).length;
      toast(`Synced ${updatedCount} of ${commitments.length} positions`, "success");
    } catch (err: any) {
      console.error("[Sync] Error:", err);
      toast(`Sync failed: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBurn = async () => {
    if (!burnTarget || !client) return;

    const token0 = TESTNET_TOKENS[0];
    const token1 = TESTNET_TOKENS[1];
    if (!token0 || !token1) return;

    const [t0, t1] =
      BigInt(token0.address) < BigInt(token1.address)
        ? [token0.address, token1.address]
        : [token1.address, token0.address];

    const poolKey: PoolKey = {
      token0: t0,
      token1: t1,
      fee: FEE_TIERS.MEDIUM.fee,
      tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
    };

    // Fetch current pool sqrt price to calculate real amounts
    let amount0Out = 0n;
    let amount1Out = 0n;
    try {
      const poolState = await client.getPoolState(poolKey);
      const amounts = getAmountsForBurn(
        poolState.sqrtPrice,
        burnTarget.tickLower,
        burnTarget.tickUpper,
        BigInt(burnTarget.liquidity),
      );
      amount0Out = amounts.amount0;
      amount1Out = amounts.amount1;
    } catch (err) {
      console.warn("Could not fetch pool state for amount estimation, using 0", err);
    }

    burn.mutate(
      {
        poolKey,
        positionCommitment: burnTarget.commitment,
        amount0Out,
        token0: t0,
        amount1Out,
        token1: t1,
        liquidity: BigInt(burnTarget.liquidity),
      },
      { onSuccess: () => setBurnTarget(null) }
    );
  };

  const hasPositionsWithoutLeafIndex = positions.some((p) => p.leafIndex === undefined);

  return (
    <PageContainer>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold tracking-tight text-text-display">Shielded Positions</h1>
          <p className="mt-2 leading-relaxed text-text-caption">
            Manage your private liquidity positions. Each position is a shielded note
            that proves you own liquidity in a price range — removing it generates a
            ZK proof and returns tokens as new shielded notes.
          </p>
        </motion.div>

        {isInitialized && hasPositionsWithoutLeafIndex && (
          <motion.div variants={itemVariants} className="rounded-[24px] border border-gold/20 bg-gold/5 p-6 backdrop-blur-xl shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold tracking-widest uppercase text-gold">Positions need sync</p>
                <p className="text-sm text-text-caption mt-1">
                  Some positions are missing leaf indexes. Click sync to fetch them from ASP.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto px-6"
                onClick={handleSync}
                loading={isSyncing}
                disabled={isSyncing}
              >
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {!isInitialized ? (
            <motion.div variants={itemVariants}>
              <Card className="flex items-center justify-center p-8 bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-[24px]">
                <p className="text-sm font-medium text-text-disabled">
                  Connect wallet and unlock vault to view positions.
                </p>
              </Card>
            </motion.div>
          ) : positions.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="flex items-center justify-center p-8 bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-[24px]">
                <p className="text-sm font-medium text-text-disabled">
                  No shielded positions. Add liquidity on the Pool page.
                </p>
              </Card>
            </motion.div>
          ) : (
            positions.map((pos) => (
              <motion.div variants={itemVariants} key={pos.commitment}>
                <div className="relative group overflow-hidden rounded-[24px] p-[1px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/5 w-full">
                  <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#c9a84c_100%)] pointer-events-none" />
                  <span className="absolute inset-0 rounded-[24px] border border-white/5 transition-opacity duration-300 pointer-events-none group-hover:opacity-0" />

                  <div className="relative z-10 bg-[#0a0a0c] backdrop-blur-xl p-6 sm:p-8 rounded-[23px] w-full h-full flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold tracking-tight text-text-display">
                          Shielded Position
                        </span>
                        {poolState ? (
                          <Badge
                            variant={getPositionStatusVariant(pos, poolState.tick)}
                            className="px-3 py-1 shadow-sm"
                          >
                            {getPositionStatusText(pos, poolState.tick)}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="px-3 py-1">Loading...</Badge>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300"
                        onClick={() => setBurnTarget(pos)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                        <p className="text-xs font-semibold tracking-widest uppercase text-text-caption mb-1">Price Range (ticks)</p>
                        <p className="text-lg font-bold text-text-display font-mono">
                          [{pos.tickLower}, {pos.tickUpper}]
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                        <p className="text-xs font-semibold tracking-widest uppercase text-text-caption mb-1">Liquidity</p>
                        <p className="text-lg font-bold text-text-display font-mono">{pos.liquidity}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30">
                        <p className="text-xs font-semibold tracking-widest uppercase text-text-caption mb-1">Leaf Index</p>
                        <p className="text-lg font-bold text-text-display font-mono">
                          {pos.leafIndex ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      <PositionFeesCard position={pos} />
                      {poolState && (
                        <PriceRangeChart position={pos} currentTick={poolState.tick} />
                      )}
                    </div>
                    {pos.txHash && (
                      <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                        <a
                          href={`https://sepolia.voyager.online/tx/${pos.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold tracking-widest uppercase text-gold hover:text-white transition-colors inline-flex items-center gap-1.5"
                        >
                          View on Voyager
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Burn confirmation modal */}
      <Modal
        open={burnTarget !== null}
        onClose={() => setBurnTarget(null)}
        title="Remove Liquidity"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-caption">
            Remove all liquidity from this shielded position? A ZK proof will be
            generated to verify ownership, and the tokens will be returned as new
            shielded notes in your vault.
          </p>
          {burnTarget && (
            <div className="rounded-xl border border-white/5 bg-gradient-to-r from-surface-elevated/80 to-surface/30 p-5 p-4 text-sm mt-4">
              <div className="flex justify-between">
                <span className="text-xs font-semibold tracking-widest uppercase text-text-caption">Range</span>
                <span className="text-sm font-bold text-text-display font-mono">
                  [{burnTarget.tickLower}, {burnTarget.tickUpper}]
                </span>
              </div>
              <div className="flex justify-between mt-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-text-caption">Liquidity</span>
                <span className="text-sm font-bold text-text-display font-mono">{burnTarget.liquidity}</span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setBurnTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleBurn}
              loading={burn.isPending}
            >
              Remove Liquidity
            </Button>
          </div>
        </div>
      </Modal>

      <ProofProgress open={burn.isPending} label="Removing Shielded Liquidity" />
    </PageContainer>
  );
}
