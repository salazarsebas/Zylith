import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { TokenSelector } from "@/components/features/shared/TokenSelector";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useDeposit } from "@/hooks/useDeposit";
import { useStarknetWallet } from "@/providers/StarknetProvider";
import { useSdkStore } from "@/stores/sdkStore";
import { TESTNET_TOKENS, type Token } from "@/config/tokens";
import { parseTokenAmount } from "@/lib/format";

interface Transaction {
  txHash: string;
  leafIndex: number;
  timestamp: number;
  token: string;
}

const STORAGE_KEY = "zylith_recent_deposits";

export function DepositCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const { isConnected } = useStarknetWallet();
  const [selectedToken, setSelectedToken] = useState<Token>(TESTNET_TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const deposit = useDeposit();

  // Load transactions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecentTxs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent transactions:", e);
      }
    }
  }, []);

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    if (recentTxs.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentTxs));
    }
  }, [recentTxs]);

  const handleDeposit = () => {
    if (!amount || !selectedToken) return;
    const parsedAmount = parseTokenAmount(amount, selectedToken.decimals);
    if (parsedAmount <= 0n) return;
    deposit.mutate(
      { amount: parsedAmount, token: selectedToken.address },
      {
        onSuccess: (data) => {
          setAmount("");
          // Add to recent transactions
          setRecentTxs(prev => [{
            txHash: data.userTxHash,
            leafIndex: data.leafIndex,
            timestamp: Date.now(),
            token: selectedToken.symbol,
          }, ...prev].slice(0, 5)); // Keep last 5
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex items-center gap-2">
          
          <h2 className="text-base font-medium text-text-heading">Shield Your Tokens</h2>
        </div>

        <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
          <p className="text-sm text-gold font-medium mb-2">What does "Shield" mean?</p>
          <p className="text-xs text-text-body leading-relaxed">
            Shielding converts your public tokens into a private note that only you can use.
            Your wallet will send the tokens to the pool, and you'll receive a secret note
            for making private swaps that no one else can see.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-text-caption font-medium">
              1
            </div>
            <p className="text-text-caption">
              Enter the amount of tokens you want to shield
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-text-caption font-medium">
              2
            </div>
            <p className="text-text-caption">
              Your wallet will ask you to approve and send the tokens
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-text-caption font-medium">
              3
            </div>
            <p className="text-text-caption">
              You'll receive a private note — check your balance on the Dashboard
            </p>
          </div>
        </div>

        <AmountInput
          label={`Amount to Shield`}
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          tokenAddress={selectedToken?.address}
          onTokenClick={() => setShowTokenSelector(true)}
        />

        {!isConnected && (
          <div className="rounded-lg border border-signal-warning/20 bg-signal-warning/5 p-3">
            <p className="text-xs text-signal-warning">
              ⚠️ Connect your wallet using the button in the top-right corner first
            </p>
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          onClick={handleDeposit}
          disabled={!amount || !isInitialized || !isConnected || deposit.isPending}
          loading={deposit.isPending}
        >
          {deposit.isPending ? "Shielding..." : `Shield ${selectedToken?.symbol}`}
        </Button>

        {deposit.isPending && (
          <div className="text-xs text-text-caption text-center">
            Please confirm the transaction in your wallet...
          </div>
        )}
      </Card>

      <TokenSelector
        open={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelect={(t) => setSelectedToken(t)}
      />

      <ProofProgress open={deposit.isPending} label="Shielding Tokens" />

      {recentTxs.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-medium text-text-heading">Recent Transactions</h3>
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div
                key={tx.txHash}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-elevated"
              >
                <div className="flex-1">
                  <p className="text-sm text-text-body font-medium">
                    Shield {tx.token} (leaf {tx.leafIndex})
                  </p>
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
