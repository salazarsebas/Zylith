import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TokenIcon } from "@/components/ui/TokenIcon";
import type { Token } from "@/config/tokens";

interface SwapConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: string;
  loading?: boolean;
}

export function SwapConfirmModal({
  open,
  onClose,
  onConfirm,
  tokenIn,
  tokenOut,
  amountIn,
  loading,
}: SwapConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Swap">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-caption">You pay</span>
            <div className="flex items-center gap-2">
              {tokenIn && <TokenIcon address={tokenIn.address} size="sm" />}
              <span className="text-sm font-medium text-text-display">
                {amountIn} {tokenIn?.symbol}
              </span>
            </div>
          </div>
          <div className="border-t border-border/50" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-caption">You receive</span>
            <div className="flex items-center gap-2">
              {tokenOut && <TokenIcon address={tokenOut.address} size="sm" />}
              <span className="text-sm font-medium text-text-display">
                ~ {tokenOut?.symbol}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-caption leading-relaxed">
          This transaction is shielded with a zero-knowledge proof. Proof generation
          may take 10-30 seconds.
        </p>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            Confirm Swap
          </Button>
        </div>
      </div>
    </Modal>
  );
}
