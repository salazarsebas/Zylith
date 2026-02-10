import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useDeposit } from "@/hooks/useDeposit";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS, type Token } from "@/config/tokens";
import { parseTokenAmount } from "@/lib/format";

export function DepositCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const [selectedToken, setSelectedToken] = useState<Token>(TESTNET_TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const deposit = useDeposit();

  const handleDeposit = () => {
    if (!amount || !selectedToken) return;
    const parsedAmount = parseTokenAmount(amount, selectedToken.decimals);
    if (parsedAmount <= 0n) return;
    deposit.mutate(
      { amount: parsedAmount, token: selectedToken.address },
      { onSuccess: () => setAmount("") }
    );
  };

  return (
    <>
      <Card className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldIcon size={18} className="text-gold" />
          <h2 className="text-base font-medium text-text-heading">Shield Tokens</h2>
        </div>
        <p className="text-sm text-text-caption">
          Move tokens from your public wallet into the privacy pool.
        </p>

        <AmountInput
          label="Amount"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          tokenAddress={selectedToken?.address}
        />

        <button
          onClick={() => setShowTokenSelector(true)}
          className="text-xs text-text-caption hover:text-gold transition-colors"
        >
          Change token
        </button>

        <Button
          variant="primary"
          className="w-full"
          onClick={handleDeposit}
          disabled={!amount || !isInitialized || deposit.isPending}
          loading={deposit.isPending}
        >
          Shield {selectedToken?.symbol ?? "Tokens"}
        </Button>
      </Card>

      <TokenSelector
        open={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelect={(t) => setSelectedToken(t)}
      />

      <ProofProgress open={deposit.isPending} label="Shielding Tokens" />
    </>
  );
}
