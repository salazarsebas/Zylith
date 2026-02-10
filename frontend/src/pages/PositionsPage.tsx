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
import { TESTNET_TOKENS } from "@/config/tokens";
import { FEE_TIERS } from "@zylith/sdk";
import type { PositionNote, PoolKey } from "@zylith/sdk";

export function PositionsPage() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const positions = useSdkStore((s) => s.unspentPositions);
  const [burnTarget, setBurnTarget] = useState<PositionNote | null>(null);
  const burn = useBurn();

  const handleBurn = () => {
    if (!burnTarget) return;

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

    burn.mutate(
      {
        poolKey,
        positionCommitment: burnTarget.commitment,
        amount0Out: 0n,
        token0: t0,
        amount1Out: 0n,
        token1: t1,
        liquidity: BigInt(burnTarget.liquidity),
      },
      { onSuccess: () => setBurnTarget(null) }
    );
  };

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-text-display">Positions</h1>
      <p className="mt-2 text-text-caption">Your shielded liquidity positions.</p>

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
                  <p className="text-text-caption">Tick Range</p>
                  <p className="text-text-body font-mono">
                    [{pos.tickLower}, {pos.tickUpper}]
                  </p>
                </div>
                <div>
                  <p className="text-text-caption">Liquidity</p>
                  <p className="text-text-body font-mono">{pos.liquidity}</p>
                </div>
                <div>
                  <p className="text-text-caption">Index</p>
                  <p className="text-text-body font-mono">
                    {pos.leafIndex ?? "—"}
                  </p>
                </div>
              </div>
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
            Remove all liquidity from this shielded position? The tokens will be
            returned as new shielded notes.
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
