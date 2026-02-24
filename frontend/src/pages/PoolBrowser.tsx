import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePoolState } from "@/hooks/usePoolState";
import { TESTNET_TOKENS } from "@/config/tokens";
import { FEE_TIERS } from "@zylith/sdk";
import type { PoolKey } from "@zylith/sdk";

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-display">
            {token0.symbol}/{token1.symbol} Pool
          </h1>
          <p className="mt-2 text-text-caption">
            View pool statistics and liquidity status. To add liquidity or swap, use the Swap page.
          </p>
        </div>

        {/* Pool Status Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-text-heading">Pool Status</h2>
            <Badge variant="default" className="text-xs">
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
                <div className="space-y-1">
                  <p className="text-xs text-text-caption">Current Tick</p>
                  <p className="text-lg font-medium text-text-body">{poolState.tick}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-caption">Total Liquidity</p>
                  <p className="text-lg font-medium text-text-body font-mono">
                    {poolState.liquidity.toString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3">
                <span className="text-sm text-text-caption">Pool Status</span>
                <Badge variant={poolState.liquidity > 0n ? "success" : "default"}>
                  {poolState.liquidity > 0n ? "Active & Ready" : "Empty"}
                </Badge>
              </div>

              {isEmpty && (
                <div className="rounded-lg border border-signal-warning/20 bg-signal-warning/5 p-4">
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
                <div className="rounded-lg border border-signal-success/20 bg-signal-success/5 p-4">
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
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-text-disabled">
                Pool not initialized or unavailable.
              </p>
            </div>
          )}
        </Card>

        {/* Next Steps */}
        {poolState && poolState.liquidity > 0n && (
          <Card className="space-y-4">
            <h2 className="text-base font-medium text-text-heading">Ready to Start</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-elevated">
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

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-elevated">
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

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-elevated">
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
      </div>
    </PageContainer>
  );
}
