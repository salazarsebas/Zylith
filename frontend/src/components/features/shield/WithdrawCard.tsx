import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { ProofProgress } from "@/components/features/shared/ProofProgress";
import { useWithdraw } from "@/hooks/useWithdraw";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";
import type { Note } from "@zylith/sdk";

interface WithdrawSuccess {
  txHash: string;
  amount: string;
  token: string;
}

export function WithdrawCard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const unspentNotes = useSdkStore((s) => s.unspentNotes);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [lastWithdraw, setLastWithdraw] = useState<WithdrawSuccess | null>(null);
  const withdraw = useWithdraw();

  const handleWithdraw = () => {
    if (!selectedNote) return;
    const noteAmount = selectedNote.amount;
    const noteToken = selectedNote.token;

    withdraw.mutate(
      { noteCommitment: selectedNote.commitment },
      {
        onSuccess: (data) => {
          setLastWithdraw({
            txHash: data.txHash,
            amount: noteAmount,
            token: noteToken,
          });
          setSelectedNote(null);
        }
      }
    );
  };

  return (
    <div className="space-y-6 w-full max-w-lg mx-auto">
      {/* Animated Snake Border Wrapper */}
      <div className="relative group overflow-hidden rounded-[24px] p-[1px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/5">
        <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#A1A1AA_100%)] pointer-events-none" />
        <span className="absolute inset-0 rounded-[24px] border border-white/5 transition-opacity duration-300 pointer-events-none group-hover:opacity-0" />

        {/* Inner Solid Card Body */}
        <div className="relative z-10 flex flex-col gap-6 bg-[#0a0a0c] p-6 sm:p-8 rounded-[23px] w-full h-full">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h2 className="text-xl font-bold tracking-tight text-text-display">Unshield Tokens</h2>
          </div>

          <div className="rounded-xl border border-white/5 bg-gradient-to-r from-surface-elevated/80 to-surface/30 p-5">
            <p className="text-sm text-text-caption leading-relaxed">
              Reveal a shielded note and withdraw its tokens back to your public wallet.
              A zero-knowledge proof verifies you own the note without revealing which one.
            </p>
          </div>

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
                  className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300 ${selectedNote?.commitment === note.commitment
                    ? "border-gold/40 bg-gold/5 shadow-[0_0_15px_rgba(201,169,78,0.15)]"
                    : "border-white/5 bg-surface/40 hover:border-white/20 hover:bg-surface-elevated"
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

          {lastWithdraw && (
            <div className="rounded-xl border border-signal-success/20 bg-signal-success/5 p-6 space-y-4 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-signal-success/20 flex items-center justify-center">
                  <span className="text-xl">✓</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-signal-success mb-1">
                    Tokens Unshielded Successfully
                  </h3>
                  <p className="text-xs text-text-caption">
                    Your tokens are now available in your wallet
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-surface-elevated/50">
                <span className="text-xs font-semibold tracking-widest uppercase text-text-caption">
                  Amount Received
                </span>
                <div className="flex items-center gap-2">
                  <TokenIcon address={lastWithdraw.token} size="sm" />
                  <span className="text-lg font-bold text-text-display font-mono">
                    {formatTokenAmount(BigInt(lastWithdraw.amount), 18)}{" "}
                    {getTokenSymbol(lastWithdraw.token)}
                  </span>
                </div>
              </div>

              <a
                href={`https://sepolia.voyager.online/tx/${lastWithdraw.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs font-bold tracking-widest uppercase text-gold hover:text-white transition-colors inline-flex items-center justify-center gap-1.5 w-full"
              >
                View Transaction on Voyager
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

      <ProofProgress open={withdraw.isPending} label="Unshielding Tokens" />
    </div>
  );
}
