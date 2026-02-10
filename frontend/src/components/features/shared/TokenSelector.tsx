import { TESTNET_TOKENS, type Token } from "@/config/tokens";
import { Modal } from "@/components/ui/Modal";
import { TokenIcon } from "@/components/ui/TokenIcon";

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  excludeAddress?: string;
}

export function TokenSelector({ open, onClose, onSelect, excludeAddress }: TokenSelectorProps) {
  const tokens = TESTNET_TOKENS.filter((t) => t.address !== excludeAddress);

  return (
    <Modal open={open} onClose={onClose} title="Select Token">
      <div className="space-y-1">
        {tokens.map((token) => (
          <button
            key={token.address}
            onClick={() => {
              onSelect(token);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface"
          >
            <TokenIcon address={token.address} size="md" />
            <div>
              <p className="text-sm font-medium text-text-heading">{token.symbol}</p>
              <p className="text-xs text-text-caption">{token.name}</p>
            </div>
          </button>
        ))}
        {tokens.length === 0 && (
          <p className="py-4 text-center text-sm text-text-disabled">No tokens available</p>
        )}
      </div>
    </Modal>
  );
}
