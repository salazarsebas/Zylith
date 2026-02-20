import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useWithdraw } from "@/hooks/useWithdraw";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";
import type { Note } from "@zylith/sdk";

export function WithdrawCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const withdraw = useWithdraw();

  const handleWithdraw = () => {
    if (!selectedNote) return;
    withdraw.mutate(
      { noteCommitment: selectedNote.commitment },
      {
        onSuccess: (data) => {
          setLastTxHash(data.txHash);
          setSelectedNote(null);
        }
      }
    );
  };

  return (
    <>
      <Card className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldIcon size={18} />
          <h2 className="text-base font-medium text-text-heading">Unshield Tokens</h2>
        </div>
        <p className="text-sm text-text-caption">
          Reveal a shielded note and withdraw its tokens back to your public wallet.
          A zero-knowledge proof verifies you own the note without revealing which one.
        </p>

        {!isInitialized ? (
          <p className="text-sm text-text-disabled">Connect wallet and unlock vault first.</p>
        ) : unspentNotes.length === 0 ? (
          <p className="text-sm text-text-disabled">No shielded notes to withdraw.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-caption">Select a shielded note to withdraw:</p>
            {unspentNotes.map((note) => (
              <button
                key={note.commitment}
                onClick={() => setSelectedNote(note)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  selectedNote?.commitment === note.commitment
                    ? "border-gold/40 bg-gold/5"
                    : "border-border hover:border-text-disabled"
                }`}
              >
                <TokenIcon address={note.token} size="sm" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-text-heading">
                    {formatTokenAmount(BigInt(note.amount), 18)}{" "}
                    {getTokenSymbol(note.token)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <Button
          variant="primary"
          className="w-full"
          onClick={handleWithdraw}
          disabled={!selectedNote || withdraw.isPending}
          loading={withdraw.isPending}
        >
          Unshield Tokens
        </Button>

        {lastTxHash && (
          <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3">
            <p className="text-sm text-text-body mb-2">✓ Tokens unshielded successfully</p>
            <a
              href={`https://sepolia.voyager.online/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gold hover:underline"
            >
              View on Voyager →
            </a>
          </div>
        )}
      </Card>

      <ProofProgress open={withdraw.isPending} label="Unshielding Tokens" />
    </>
  );
}
