import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAllPositionsFees } from "@/hooks/useAllPositionsFees";
import { useSdkStore } from "@/stores/sdkStore";
import { formatTokenAmount } from "@/lib/format";
import { TESTNET_TOKENS } from "@/config/tokens";

/**
 * Displays total uncollected fees across all shielded positions.
 * Shows real-time aggregated earnings from on-chain data.
 */
export function TotalEarningsCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const positions = useSdkStore((s) => s.unspentPositions);
  const { data: fees, isLoading, isError } = useAllPositionsFees();

  // Get token info (hardcoded STRK/ETH pool)
  const token0 = TESTNET_TOKENS.find((t) => t.symbol === "ETH");
  const token1 = TESTNET_TOKENS.find((t) => t.symbol === "STRK");

  if (!token0 || !token1) {
    return null;
  }

  // Determine which token is token0 and token1 based on address ordering
  const [displayToken0, displayToken1] =
    BigInt(token0.address) < BigInt(token1.address)
      ? [token0, token1]
      : [token1, token0];

  const hasEarnings = fees && (fees.totalTokensOwed0 > 0n || fees.totalTokensOwed1 > 0n);

  return (
    <Card animated className="h-full border-white/5 bg-surface/40 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-text-display">
          Fee Earnings
        </h2>
        <Badge variant={hasEarnings ? "gold" : "default"} className="px-3 py-1">
          {positions.length} {positions.length === 1 ? "Position" : "Positions"}
        </Badge>
      </div>

      {!isInitialized ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl">
          <p className="text-base text-text-disabled font-light">
            Vault is locked. Initialize SDK to view earnings.
          </p>
        </div>
      ) : positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl">
          <p className="text-base text-text-disabled font-light mb-2">
            No active positions.
          </p>
          <p className="text-sm text-text-caption">
            Add liquidity to start earning fees.
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="h-20 bg-surface-elevated/50 rounded-xl animate-pulse" />
          <div className="h-20 bg-surface-elevated/50 rounded-xl animate-pulse" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border/50 rounded-2xl">
          <p className="text-base text-signal-error">Failed to load fee data</p>
        </div>
      ) : fees ? (
        <div className="space-y-6">
          {/* Total Earnings Display */}
          <div className="space-y-4">
            <div className="p-6 rounded-xl border border-gold/10 bg-gradient-to-br from-gold/5 to-surface-elevated/30">
              <p className="text-xs font-semibold tracking-widest uppercase text-gold mb-3">
                Total Uncollected
              </p>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-text-caption">{displayToken0.symbol}</span>
                  <span className="text-2xl font-bold text-text-display font-mono">
                    {formatTokenAmount(fees.totalTokensOwed0, displayToken0.decimals, 4)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-text-caption">{displayToken1.symbol}</span>
                  <span className="text-2xl font-bold text-text-display font-mono">
                    {formatTokenAmount(fees.totalTokensOwed1, displayToken1.decimals, 4)}
                  </span>
                </div>
              </div>
            </div>

            {!hasEarnings && (
              <p className="text-sm text-text-caption text-center italic">
                No fees accumulated yet. Fees accrue as users trade in your position's price range.
              </p>
            )}
          </div>

          {/* Fee breakdown hint */}
          {fees.positions.length > 1 && (
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs text-text-caption">
                Aggregated from {fees.positions.length} active positions. Visit Positions page for individual breakdowns.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
