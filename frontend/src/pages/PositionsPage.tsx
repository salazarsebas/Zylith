import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useBurn } from "@/hooks/useBurn";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { TESTNET_TOKENS } from "@/config/tokens";
import { FEE_TIERS, getAmountsForBurn } from "@zylith/sdk";
import type { PositionNote, PoolKey } from "@zylith/sdk";

export function PositionsPage() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const positions = useSdkStore((s) => s.unspentPositions);
  const client = useSdkStore((s) => s.client);
  const refreshBalances = useSdkStore((s) => s.refreshBalances);
  const [burnTarget, setBurnTarget] = useState<PositionNote | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const burn = useBurn();
  const { toast } = useToast();

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
      <div>
        <h1 className="text-2xl font-semibold text-text-display">Shielded Positions</h1>
        <p className="mt-2 text-text-caption">
          Manage your private liquidity positions. Each position is a shielded note
          that proves you own liquidity in a price range — removing it generates a
          ZK proof and returns tokens as new shielded notes.
        </p>
      </div>

      {isInitialized && hasPositionsWithoutLeafIndex && (
        <div className="mt-4 rounded-lg border border-gold/20 bg-gold/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gold">Positions need sync</p>
              <p className="text-xs text-text-caption mt-1">
                Some positions are missing leaf indexes. Click sync to fetch them from ASP.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              loading={isSyncing}
              disabled={isSyncing}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {!isInitialized ? (
          <Card>
            <p className="text-sm text-text-disabled">
              Connect wallet and unlock vault to view positions.
            </p>
          </Card>
        ) : positions.length === 0 ? (
          <Card>
            <p className="text-sm text-text-disabled">
              No shielded positions. Add liquidity on the Pool page.
            </p>
          </Card>
        ) : (
          positions.map((pos) => (
            <Card key={pos.commitment}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldIcon size={14} className="text-gold" />
                  <span className="text-sm font-medium text-text-heading">
                    Shielded Position
                  </span>
                  <Badge variant="gold">Active</Badge>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBurnTarget(pos)}
                >
                  Remove
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-text-caption">Price Range (ticks)</p>
                  <p className="text-text-body font-mono">
                    [{pos.tickLower}, {pos.tickUpper}]
                  </p>
                </div>
                <div>
                  <p className="text-text-caption">Liquidity</p>
                  <p className="text-text-body font-mono">{pos.liquidity}</p>
                </div>
                <div>
                  <p className="text-text-caption">Leaf Index</p>
                  <p className="text-text-body font-mono">
                    {pos.leafIndex ?? "—"}
                  </p>
                </div>
              </div>
              {pos.txHash && (
                <div className="mt-3 pt-3 border-t border-border">
                  <a
                    href={`https://sepolia.voyager.online/tx/${pos.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gold hover:underline"
                  >
                    View on Voyager →
                  </a>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

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
            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-caption">Range</span>
                <span className="text-text-body font-mono">
                  [{burnTarget.tickLower}, {burnTarget.tickUpper}]
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-text-caption">Liquidity</span>
                <span className="text-text-body font-mono">{burnTarget.liquidity}</span>
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
