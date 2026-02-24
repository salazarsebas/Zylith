import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface ProofProgressProps {
  open: boolean;
  label?: string;
}

export function ProofProgress({ open, label = "Shielded Transaction" }: ProofProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  // Heuristic progress: proof ~15s, submit ~5s, confirm ~10s
  const progress = Math.min(95, elapsed < 15 ? (elapsed / 15) * 60 : 60 + ((elapsed - 15) / 15) * 30);
  const stage =
    elapsed < 15
      ? "Generating zero-knowledge proof..."
      : elapsed < 20
        ? "Submitting to Starknet..."
        : "Waiting for confirmation...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Spinner size="lg" />
        </div>
        <div className="mb-2 flex items-center justify-center gap-2">
          
          <h3 className="text-sm font-semibold text-text-display">{label}</h3>
        </div>
        <p className="mb-4 text-sm text-text-caption">{stage}</p>
        <ProgressBar value={progress} />
        <p className="mt-3 text-xs text-text-disabled">{elapsed}s elapsed</p>
        {elapsed > 30 && (
          <p className="mt-1 text-xs text-text-caption">
            This is taking longer than usual. Please wait...
          </p>
        )}
      </div>
    </div>
  );
}
