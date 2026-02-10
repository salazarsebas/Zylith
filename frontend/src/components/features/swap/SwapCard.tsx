import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { SwapConfirmModal } from "./SwapConfirmModal";
import { useSwap } from "@/hooks/useSwap";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS, type Token, getTokenSymbol } from "@/config/tokens";
import { parseTokenAmount, formatTokenAmount } from "@/lib/format";
import { FEE_TIERS } from "@zylith/sdk";
import type { Note } from "@zylith/sdk";

export function SwapCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const balances = useSdkStore((s) => s.balances);

  const [tokenIn, setTokenIn] = useState<Token>(TESTNET_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(TESTNET_TOKENS[1] ?? null);
  const [amountIn, setAmountIn] = useState("");
  const [showTokenInSelector, setShowTokenInSelector] = useState(false);
  const [showTokenOutSelector, setShowTokenOutSelector] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const swap = useSwap();

  // Find a suitable note to spend
  const selectedNote: Note | undefined = useMemo(() => {
    if (!amountIn || !tokenIn) return undefined;
    const parsed = parseTokenAmount(amountIn, tokenIn.decimals);
    return unspentNotes.find(
      (n) =>
        n.token.toLowerCase() === tokenIn.address.toLowerCase() &&
        BigInt(n.amount) >= parsed
    );
  }, [unspentNotes, amountIn, tokenIn]);

  const tokenInBalance = balances[tokenIn?.address ?? ""] ?? 0n;
  const parsedAmountIn = amountIn
    ? parseTokenAmount(amountIn, tokenIn?.decimals ?? 18)
    : 0n;

  const canSwap =
    isInitialized &&
    tokenIn &&
    tokenOut &&
    parsedAmountIn > 0n &&
    selectedNote !== undefined &&
    !swap.isPending;

  const handleFlip = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut ?? TESTNET_TOKENS[0]);
    setTokenOut(temp);
    setAmountIn("");
  };

  const handleConfirmSwap = () => {
    if (!tokenIn || !tokenOut || !selectedNote) return;

    // Build PoolKey (token0 < token1)
    const [t0, t1] =
      BigInt(tokenIn.address) < BigInt(tokenOut.address)
        ? [tokenIn.address, tokenOut.address]
        : [tokenOut.address, tokenIn.address];

    swap.mutate(
      {
        poolKey: {
          token0: t0,
          token1: t1,
          fee: FEE_TIERS.MEDIUM.fee,
          tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
        },
        inputNoteCommitment: selectedNote.commitment,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: parsedAmountIn,
        amountOutMin: 0n,
        expectedAmountOut: 0n,
        sqrtPriceLimit: 0n,
      },
      { onSuccess: () => { setAmountIn(""); setShowConfirm(false); } }
    );
  };

  return (
    <>
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldIcon size={18} className="text-gold" />
          <h2 className="text-base font-medium text-text-heading">Shielded Swap</h2>
        </div>

        {/* Token In */}
        <AmountInput
          label="You pay"
          placeholder="0.0"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          tokenAddress={tokenIn?.address}
          balance={formatTokenAmount(tokenInBalance, tokenIn?.decimals ?? 18)}
          onMax={() =>
            setAmountIn(formatTokenAmount(tokenInBalance, tokenIn?.decimals ?? 18))
          }
        />

        {/* Flip button */}
        <div className="flex justify-center -my-1">
          <button
            onClick={handleFlip}
            className="rounded-full border border-border bg-surface p-2 transition-colors hover:border-text-disabled hover:bg-surface-elevated"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M5 10l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-caption"
              />
            </svg>
          </button>
        </div>

        {/* Token Out */}
        <AmountInput
          label="You receive"
          placeholder="0.0"
          readOnly
          value="—"
          tokenAddress={tokenOut?.address}
        />

        <div className="flex items-center justify-between text-xs text-text-caption">
          <button
            onClick={() => setShowTokenInSelector(true)}
            className="hover:text-gold transition-colors"
          >
            Change {getTokenSymbol(tokenIn?.address ?? "")}
          </button>
          <button
            onClick={() => setShowTokenOutSelector(true)}
            className="hover:text-gold transition-colors"
          >
            Change {tokenOut ? getTokenSymbol(tokenOut.address) : "output token"}
          </button>
        </div>

        {parsedAmountIn > 0n && !selectedNote && (
          <p className="text-xs text-signal-error">
            No shielded note with sufficient balance. Deposit first.
          </p>
        )}

        <Button
          variant="primary"
          className="w-full"
          disabled={!canSwap}
          onClick={() => setShowConfirm(true)}
        >
          Shielded Swap
        </Button>
      </Card>

      <SwapConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSwap}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        loading={swap.isPending}
      />

      <TokenSelector
        open={showTokenInSelector}
        onClose={() => setShowTokenInSelector(false)}
        onSelect={(t) => setTokenIn(t)}
        excludeAddress={tokenOut?.address}
      />
      <TokenSelector
        open={showTokenOutSelector}
        onClose={() => setShowTokenOutSelector(false)}
        onSelect={(t) => setTokenOut(t)}
        excludeAddress={tokenIn?.address}
      />

      <ProofProgress open={swap.isPending} label="Shielded Swap" />
    </>
  );
}
