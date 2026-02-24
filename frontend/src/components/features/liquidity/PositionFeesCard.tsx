import { usePositionFees } from "@/hooks/usePositionFees";
import { formatTokenAmount } from "@/lib/format";
import { TESTNET_TOKENS } from "@/config/tokens";
import type { PositionNote } from "@zylith/sdk";

interface PositionFeesCardProps {
  position: PositionNote;
}

/**
 * Displays uncollected fees for a specific shielded position.
 * Shows real-time data from on-chain position state.
 */
export function PositionFeesCard({ position }: PositionFeesCardProps) {
  const { data: fees, isLoading, isError } = usePositionFees(position);

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

  return (
    <div className="rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30 p-5">
      <p className="text-xs font-semibold tracking-widest uppercase text-text-caption mb-3">
        Uncollected Fees
      </p>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-6 bg-surface-elevated/50 rounded animate-pulse" />
          <div className="h-6 bg-surface-elevated/50 rounded animate-pulse" />
        </div>
      ) : isError ? (
        <p className="text-sm text-signal-error">Failed to load fees</p>
      ) : fees ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-caption">{displayToken0.symbol}</span>
            <span className="text-lg font-bold text-text-display font-mono">
              {formatTokenAmount(fees.tokensOwed0, displayToken0.decimals, 4)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-caption">{displayToken1.symbol}</span>
            <span className="text-lg font-bold text-text-display font-mono">
              {formatTokenAmount(fees.tokensOwed1, displayToken1.decimals, 4)}
            </span>
          </div>

          {fees.tokensOwed0 === 0n && fees.tokensOwed1 === 0n && (
            <p className="text-xs text-text-caption mt-2 italic">
              No fees accumulated yet
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
