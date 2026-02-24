import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { SwapConfirmModal } from "./SwapConfirmModal";
import { useSwap } from "@/hooks/useSwap";
import { usePoolOperations } from "@/hooks/usePoolOperations";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS, type Token } from "@/config/tokens";
import { parseTokenAmount, formatTokenAmount } from "@/lib/format";
import { FEE_TIERS } from "@zylith/sdk";
import type { Note } from "@zylith/sdk";

interface SwapTransaction {
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  timestamp: number;
  isPrivate: boolean;
}

const STORAGE_KEY = "zylith_recent_swaps";

export function SwapCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const balances = useSdkStore((s) => s.balances);

  const [tokenIn, setTokenIn] = useState<Token>(TESTNET_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(TESTNET_TOKENS[1] ?? null);
  const [amountIn, setAmountIn] = useState("");
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectingTokenType, setSelectingTokenType] = useState<"in" | "out">("in");
  const [showConfirm, setShowConfirm] = useState(false);
  const [usePublicSwap, setUsePublicSwap] = useState(false);
  const [recentSwaps, setRecentSwaps] = useState<SwapTransaction[]>([]);

  const swap = useSwap();
  const poolOps = usePoolOperations();

  // Load swaps from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecentSwaps(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent swaps:", e);
      }
    }
  }, []);

  // Save swaps to localStorage whenever they change
  useEffect(() => {
    if (recentSwaps.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSwaps));
    }
  }, [recentSwaps]);

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

  const canSwapPrivate =
    isInitialized &&
    tokenIn &&
    tokenOut &&
    parsedAmountIn > 0n &&
    selectedNote !== undefined &&
    !swap.isPending;

  const canSwapPublic =
    poolOps.isConnected &&
    tokenIn &&
    tokenOut &&
    parsedAmountIn > 0n &&
    !poolOps.isLoading;

  const handleFlip = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut ?? TESTNET_TOKENS[0]);
    setTokenOut(temp);
    setAmountIn("");
  };

  const handleConfirmSwap = async () => {
    if (!tokenIn || !tokenOut) return;

    if (usePublicSwap) {
      // Public swap via wallet
      try {
        const txHash = await poolOps.executeSwap({
          tokenInAddress: tokenIn.address,
          tokenOutAddress: tokenOut.address,
          amountIn: parsedAmountIn,
          fee: FEE_TIERS.MEDIUM.fee,
          tickSpacing: FEE_TIERS.MEDIUM.tickSpacing,
        });

        // Add to recent swaps
        setRecentSwaps(prev => [{
          txHash: txHash || "unknown",
          tokenIn: tokenIn.symbol,
          tokenOut: tokenOut.symbol,
          amountIn: amountIn,
          timestamp: Date.now(),
          isPrivate: false,
        }, ...prev].slice(0, 5));

        setAmountIn("");
        setShowConfirm(false);
      } catch (err) {
        console.error("Public swap failed:", err);
      }
    } else {
      // Private (shielded) swap
      if (!selectedNote) return;

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
        {
          onSuccess: (data) => {
            // Add to recent swaps
            setRecentSwaps(prev => [{
              txHash: data.txHash,
              tokenIn: tokenIn.symbol,
              tokenOut: tokenOut.symbol,
              amountIn: amountIn,
              timestamp: Date.now(),
              isPrivate: true,
            }, ...prev].slice(0, 5));

            setAmountIn("");
            setShowConfirm(false);
          }
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          
          <h2 className="text-base font-medium text-text-heading">
            {usePublicSwap ? "Public Swap" : "Shielded Swap"}
          </h2>
        </div>
        <p className="text-xs text-text-caption">
          {usePublicSwap
            ? "Standard on-chain swap — visible to everyone. Tokens are swapped directly from your wallet."
            : "Private swap using zero-knowledge proofs. Spends a shielded note and produces a new one — no one can see what you traded."}
        </p>

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
          onTokenClick={() => {
            setSelectingTokenType("in");
            setShowTokenSelector(true);
          }}
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
          onTokenClick={() => {
            setSelectingTokenType("out");
            setShowTokenSelector(true);
          }}
        />

        {/* Privacy toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3">
          <div className="flex items-center gap-2">
            
            <span className="text-xs text-text-caption">
              {usePublicSwap ? "Public swap (visible on-chain)" : "Private swap (zero-knowledge)"}
            </span>
          </div>
          <button
            onClick={() => setUsePublicSwap(!usePublicSwap)}
            className="text-xs text-gold hover:text-gold/80"
          >
            {usePublicSwap ? "Enable Privacy" : "Disable Privacy"}
          </button>
        </div>

        {!usePublicSwap && parsedAmountIn > 0n && !selectedNote && (
          <p className="text-xs text-signal-error">
            No shielded note with sufficient balance. Shield tokens first on the Shield page.
          </p>
        )}

        {poolOps.error && (
          <p className="text-xs text-signal-error">{poolOps.error}</p>
        )}

        <Button
          variant="primary"
          className="w-full"
          disabled={usePublicSwap ? !canSwapPublic : !canSwapPrivate}
          onClick={() => setShowConfirm(true)}
        >
          {usePublicSwap ? "Swap" : "Shielded Swap"}
        </Button>
      </Card>

      <SwapConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSwap}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        loading={usePublicSwap ? poolOps.isLoading : swap.isPending}
      />

      <TokenSelector
        open={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelect={(t) => {
          if (selectingTokenType === "in") {
            setTokenIn(t);
          } else {
            setTokenOut(t);
          }
          setShowTokenSelector(false);
        }}
        excludeAddress={selectingTokenType === "in" ? tokenOut?.address : tokenIn?.address}
      />

      <ProofProgress open={swap.isPending} label="Shielded Swap" />

      {recentSwaps.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-medium text-text-heading">Recent Swaps</h3>
          <div className="space-y-2">
            {recentSwaps.map((tx) => (
              <div
                key={tx.txHash}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-text-body font-medium">
                      {tx.amountIn} {tx.tokenIn} → {tx.tokenOut}
                    </p>
                    {tx.isPrivate && (
                      
                    )}
                  </div>
                  <p className="text-xs text-text-caption mt-0.5">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <a
                  href={`https://sepolia.voyager.online/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  View on Voyager
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
