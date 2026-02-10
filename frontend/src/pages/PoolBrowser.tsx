import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { Input } from "@/components/ui/Input";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { usePoolState } from "@/hooks/usePoolState";
import { useMint } from "@/hooks/useMint";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS, getTokenSymbol } from "@/config/tokens";
import { formatTokenAmount, parseTokenAmount } from "@/lib/format";
import { FEE_TIERS } from "@zylith/sdk";
import type { PoolKey, Note } from "@zylith/sdk";

const FEE_OPTIONS = [
  { label: "0.05%", ...FEE_TIERS.LOW },
  { label: "0.30%", ...FEE_TIERS.MEDIUM },
  { label: "1.00%", ...FEE_TIERS.HIGH },
];

export function PoolBrowser() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);

  // Pool selection
  const token0 = TESTNET_TOKENS[0];
  const token1 = TESTNET_TOKENS[1];
  const [feeTier, setFeeTier] = useState(FEE_OPTIONS[1]);

  const poolKey: PoolKey | null =
    token0 && token1
      ? {
          token0: BigInt(token0.address) < BigInt(token1.address) ? token0.address : token1.address,
          token1: BigInt(token0.address) < BigInt(token1.address) ? token1.address : token0.address,
          fee: feeTier.fee,
          tickSpacing: feeTier.tickSpacing,
        }
      : null;

  const { data: poolState, isLoading: poolLoading } = usePoolState(poolKey);

  // Liquidity form
  const [tickLower, setTickLower] = useState("-1000");
  const [tickUpper, setTickUpper] = useState("1000");
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");

  const mint = useMint();

  const findNote = (tokenAddr: string, minAmount: bigint): Note | undefined =>
    unspentNotes.find(
      (n) => n.token.toLowerCase() === tokenAddr.toLowerCase() && BigInt(n.amount) >= minAmount
    );

  const handleMint = () => {
    if (!poolKey || !token0 || !token1) return;
    const parsed0 = parseTokenAmount(amount0, token0.decimals);
    const parsed1 = parseTokenAmount(amount1, token1.decimals);
    const note0 = findNote(poolKey.token0, parsed0);
    const note1 = findNote(poolKey.token1, parsed1);
    if (!note0 || !note1) return;

    mint.mutate(
      {
        poolKey,
        inputNote0Commitment: note0.commitment,
        inputNote1Commitment: note1.commitment,
        tickLower: parseInt(tickLower),
        tickUpper: parseInt(tickUpper),
        liquidity: parsed0,
        amount0: parsed0,
        amount1: parsed1,
      },
      {
        onSuccess: () => {
          setAmount0("");
          setAmount1("");
        },
      }
    );
  };

  return (
    <PageContainer size="wide">
      <h1 className="text-2xl font-semibold text-text-display">Pools</h1>
      <p className="mt-2 text-text-caption">
        Browse pools and add shielded liquidity.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Pool Info */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-text-heading">
              {token0?.symbol}/{token1?.symbol}
            </h2>
            <div className="flex gap-1">
              {FEE_OPTIONS.map((opt) => (
                <button
                  key={opt.fee}
                  onClick={() => setFeeTier(opt)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    feeTier.fee === opt.fee
                      ? "bg-gold/10 text-gold border border-gold/20"
                      : "text-text-caption hover:text-text-body border border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {poolLoading ? (
            <p className="text-sm text-text-disabled">Loading pool state...</p>
          ) : poolState ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-caption">Current Tick</span>
                <span className="text-text-body">{poolState.tick}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-caption">Liquidity</span>
                <span className="text-text-body font-mono">
                  {poolState.liquidity.toString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-caption">Status</span>
                <Badge variant={poolState.liquidity > 0n ? "success" : "default"}>
                  {poolState.liquidity > 0n ? "Active" : "Empty"}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-disabled">
              Pool not initialized or unavailable.
            </p>
          )}
        </Card>

        {/* Add Liquidity */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} className="text-gold" />
            <h2 className="text-base font-medium text-text-heading">
              Add Shielded Liquidity
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tick Lower"
              value={tickLower}
              onChange={(e) => setTickLower(e.target.value)}
              placeholder="-1000"
            />
            <Input
              label="Tick Upper"
              value={tickUpper}
              onChange={(e) => setTickUpper(e.target.value)}
              placeholder="1000"
            />
          </div>

          <AmountInput
            label={`Amount ${getTokenSymbol(poolKey?.token0 ?? "")}`}
            placeholder="0.0"
            value={amount0}
            onChange={(e) => setAmount0(e.target.value)}
            tokenAddress={poolKey?.token0}
            balance={formatTokenAmount(
              useSdkStore.getState().balances[poolKey?.token0 ?? ""] ?? 0n,
              18
            )}
          />

          <AmountInput
            label={`Amount ${getTokenSymbol(poolKey?.token1 ?? "")}`}
            placeholder="0.0"
            value={amount1}
            onChange={(e) => setAmount1(e.target.value)}
            tokenAddress={poolKey?.token1}
            balance={formatTokenAmount(
              useSdkStore.getState().balances[poolKey?.token1 ?? ""] ?? 0n,
              18
            )}
          />

          <Button
            variant="primary"
            className="w-full"
            onClick={handleMint}
            disabled={!isInitialized || !amount0 || !amount1 || mint.isPending}
            loading={mint.isPending}
          >
            Add Shielded Liquidity
          </Button>
        </Card>
      </div>

      <ProofProgress open={mint.isPending} label="Adding Shielded Liquidity" />
    </PageContainer>
  );
}
