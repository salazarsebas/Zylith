import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface ProofProgressProps {
  open: boolean;
  label?: string;
}

const steps = [
  { label: "Generating Proof", duration: 15, icon: "⚡" },
  { label: "Submitting Transaction", duration: 5, icon: "📡" },
  { label: "Confirming on Chain", duration: 10, icon: "✓" },
];

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

  // Calculate current step
  const currentStep = elapsed < 15 ? 0 : elapsed < 20 ? 1 : 2;

  // Heuristic progress: proof ~15s, submit ~5s, confirm ~10s
  const progress = Math.min(95, elapsed < 15 ? (elapsed / 15) * 60 : 60 + ((elapsed - 15) / 15) * 30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Spinner size="lg" />
        </div>

        <h3 className="text-lg font-bold text-text-display mb-6">{label}</h3>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-between px-4">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                  scale: i <= currentStep ? 1 : 0.8,
                  opacity: i <= currentStep ? 1 : 0.3,
                }}
                className={cn(
                  "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                  i < currentStep
                    ? "bg-gold/20 border-gold text-gold"
                    : i === currentStep
                    ? "bg-gold/10 border-gold text-gold animate-pulse"
                    : "bg-surface border-border text-text-disabled"
                )}
              >
                {i < currentStep ? (
                  <span className="text-xl">✓</span>
                ) : (
                  <span className="text-xl">{i === currentStep ? step.icon : i + 1}</span>
                )}
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium text-center max-w-[80px]",
                  i <= currentStep ? "text-text-body" : "text-text-disabled"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <ProgressBar value={progress} />

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-text-caption">{elapsed}s elapsed</span>
          <span className="text-text-disabled">~{30 - elapsed}s remaining</span>
        </div>

        {elapsed > 30 && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-xs text-signal-warning"
          >
            Taking longer than usual. Please wait...
          </motion.p>
        )}
      </div>
    </div>
  );
}
