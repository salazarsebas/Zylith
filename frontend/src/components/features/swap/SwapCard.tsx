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
import { cn } from "@/lib/cn";

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
    <div className="space-y-6 w-full max-w-lg mx-auto">
      <Card className="flex flex-col gap-6 bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-[24px] shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <h2 className="text-xl font-bold tracking-tight text-text-display">
            {usePublicSwap ? "Public Swap" : "Shielded Swap"}
          </h2>
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              usePublicSwap ? "bg-signal-warning" : "bg-gold animate-pulse"
            )} />
            <span className="text-xs font-semibold tracking-widest uppercase text-text-caption">
              {usePublicSwap ? "Public" : "Private"}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-2">
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

          {/* Premium Flip button */}
          <div className="flex justify-center -my-5 relative z-20">
            <button
              onClick={handleFlip}
              className="group flex flex-shrink-0 items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-surface/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110 hover:border-gold/30 hover:bg-surface-elevated hover:shadow-[0_0_20px_rgba(201,169,78,0.2)]"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-text-caption group-hover:text-gold transition-colors duration-300">
                <path
                  d="M8 3v10M5 10l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
        </div>

        <div className="flex flex-col gap-6 pt-4 border-t border-white/5">
          {/* Privacy toggle */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-gradient-to-r from-surface-elevated/80 to-surface/30 p-5 transition-all duration-300 hover:border-gold/20">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-text-heading">
                {usePublicSwap ? "Public Engine" : "Zero-Knowledge Engine"}
              </span>
              <span className="text-xs text-text-caption font-medium">
                {usePublicSwap ? "Visible on Sepolia" : "100% Cryptographic Privacy"}
              </span>
            </div>
            <button
              onClick={() => setUsePublicSwap(!usePublicSwap)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold tracking-widest uppercase transition-all bg-surface-elevated border border-white/10 hover:border-gold/40 hover:text-gold hover:shadow-[0_0_15px_rgba(201,169,78,0.15)]"
            >
              {usePublicSwap ? "Shield" : "Unshield"}
            </button>
          </div>

          {!usePublicSwap && parsedAmountIn > 0n && !selectedNote && (
            <div className="p-4 rounded-xl bg-signal-error/10 border border-signal-error/20">
              <p className="text-sm text-signal-error font-medium text-center">
                No shielded note with sufficient balance. Shield tokens first on the Shield page.
              </p>
            </div>
          )}

          {poolOps.error && (
            <div className="p-4 rounded-xl bg-signal-error/10 border border-signal-error/20">
              <p className="text-sm text-signal-error font-medium text-center">{poolOps.error}</p>
            </div>
          )}

          <div>
            <Button
              variant="primary"
              className="w-full h-16 text-lg font-bold tracking-widest uppercase shadow-lg shadow-gold/20"
              disabled={usePublicSwap ? !canSwapPublic : !canSwapPrivate}
              onClick={() => setShowConfirm(true)}
            >
              {usePublicSwap ? "Execute Swap" : "Execute Shielded Swap"}
            </Button>
          </div>
        </div>
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
        <Card className="space-y-4 bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-[24px] shadow-2xl mt-8">
          <h3 className="text-sm font-semibold tracking-widest uppercase text-text-caption">Recent Transactions</h3>
          <div className="space-y-3">
            {recentSwaps.map((tx) => (
              <div
                key={tx.txHash}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30 transition-all duration-300 hover:border-gold/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-base text-text-display font-bold tracking-tight">
                      {tx.amountIn} <span className="text-text-caption font-medium mx-1">{tx.tokenIn}</span> → <span className="text-text-caption font-medium mx-1">{tx.tokenOut}</span>
                    </p>
                    {tx.isPrivate && (
                      <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-[10px] uppercase tracking-widest text-gold font-bold">
                        Shielded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-disabled mt-1">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
                <a
                  href={`https://sepolia.voyager.online/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 sm:mt-0 text-xs font-semibold tracking-widest uppercase text-gold hover:text-white transition-colors flex items-center gap-1.5"
                >
                  Voyager
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
