import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useMint } from "@/hooks/useMint";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS } from "@/config/tokens";
import { parseTokenAmount } from "@/lib/format";
import { FEE_TIERS } from "@zylith/sdk";
import type { PoolKey } from "@zylith/sdk";

export function AddLiquidityCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);

  const token0 = TESTNET_TOKENS.find(t => t.symbol === "STRK")!;
  const token1 = TESTNET_TOKENS.find(t => t.symbol === "ETH")!;

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [tickLower, setTickLower] = useState("-600");
  const [tickUpper, setTickUpper] = useState("600");

  const mint = useMint();

  // Find suitable notes
  const note0 = useMemo(() => {
    if (!amount0) return undefined;
    const parsed = parseTokenAmount(amount0, token0.decimals);
    return unspentNotes.find(
      n => n.token.toLowerCase() === token0.address.toLowerCase() && BigInt(n.amount) >= parsed
    );
  }, [unspentNotes, amount0, token0]);

  const note1 = useMemo(() => {
    if (!amount1) return undefined;
    const parsed = parseTokenAmount(amount1, token1.decimals);
    return unspentNotes.find(
      n => n.token.toLowerCase() === token1.address.toLowerCase() && BigInt(n.amount) >= parsed
    );
  }, [unspentNotes, amount1, token1]);

  const parsedAmount0 = amount0 ? parseTokenAmount(amount0, token0.decimals) : 0n;
  const parsedAmount1 = amount1 ? parseTokenAmount(amount1, token1.decimals) : 0n;

  const canAddLiquidity =
    isInitialized &&
    parsedAmount0 > 0n &&
    parsedAmount1 > 0n &&
    note0 &&
    note1 &&
    tickLower &&
    tickUpper &&
    parseInt(tickLower) < parseInt(tickUpper) &&
    !mint.isPending;

  const handleAddLiquidity = () => {
    if (!canAddLiquidity || !note0 || !note1) return;

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

    const liquidity = parsedAmount0 > parsedAmount1 ? parsedAmount1 : parsedAmount0;

    mint.mutate({
      poolKey,
      inputNote0Commitment: note0.commitment,
      inputNote1Commitment: note1.commitment,
      tickLower: parseInt(tickLower),
      tickUpper: parseInt(tickUpper),
      liquidity,
      amount0: parsedAmount0,
      amount1: parsedAmount1,
    });
  };

  return (
    <>
      <Card className="space-y-5">
        <div className="flex items-center gap-2">
          
          <h2 className="text-base font-medium text-text-heading">
            Add Shielded Liquidity
          </h2>
        </div>

        <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
          <p className="text-sm text-gold font-medium mb-2">Private Liquidity Provider</p>
          <p className="text-xs text-text-body leading-relaxed">
            Add liquidity privately using your shielded notes. Your position will be encrypted and you'll earn fees without revealing your liquidity amount.
          </p>
        </div>

        <div className="space-y-4">
          <AmountInput label={`${token0.symbol} Amount`} placeholder="0.0" value={amount0} onChange={(e) => setAmount0(e.target.value)} tokenAddress={token0.address} />
          <AmountInput label={`${token1.symbol} Amount`} placeholder="0.0" value={amount1} onChange={(e) => setAmount1(e.target.value)} tokenAddress={token1.address} />

          <div className="space-y-3">
            <p className="text-xs font-medium text-text-heading">Price Range (ticks)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-text-caption">Min Tick</label>
                <Input type="number" value={tickLower} onChange={(e) => setTickLower(e.target.value)} placeholder="-600" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-caption">Max Tick</label>
                <Input type="number" value={tickUpper} onChange={(e) => setTickUpper(e.target.value)} placeholder="600" />
              </div>
            </div>
            <p className="text-xs text-text-caption">Suggested: -600 to 600 (full range)</p>
          </div>

          {parsedAmount0 > 0n && !note0 && (
            <div className="rounded-lg border border-signal-error/20 bg-signal-error/5 p-3">
              <p className="text-xs text-signal-error font-medium">No {token0.symbol} note with sufficient balance.</p>
              <p className="text-xs text-text-caption mt-1">Go to <a href="/app/shield" className="text-gold hover:underline">Shield page</a> to deposit {token0.symbol} first.</p>
            </div>
          )}
          {parsedAmount1 > 0n && !note1 && (
            <div className="rounded-lg border border-signal-error/20 bg-signal-error/5 p-3">
              <p className="text-xs text-signal-error font-medium">No {token1.symbol} note with sufficient balance.</p>
              <p className="text-xs text-text-caption mt-1">Go to <a href="/app/shield" className="text-gold hover:underline">Shield page</a> to deposit {token1.symbol} first.</p>
            </div>
          )}
        </div>

        <Button variant="primary" className="w-full" onClick={handleAddLiquidity} disabled={!canAddLiquidity} loading={mint.isPending}>
          {mint.isPending ? "Adding Liquidity..." : "Add Shielded Liquidity"}
        </Button>
      </Card>

      <ProofProgress open={mint.isPending} label="Adding Shielded Liquidity" />
    </>
  );
}
