import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useStarknetWallet } from "@/providers/StarknetProvider";

export function ConnectButton() {
  const { address, isConnected, isConnecting, walletName, connect, disconnect } =
    useStarknetWallet();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isConnected) {
    return (
      <Button
        variant="secondary"
        size="md"
        onClick={connect}
        disabled={isConnecting}
        loading={isConnecting}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors",
          "hover:border-gold/30 hover:text-text-heading",
          showMenu ? "text-text-heading border-gold/30" : "text-text-body"
        )}
      >
        <span className="h-2 w-2 rounded-full bg-signal-success" />
        {truncateAddress(address ?? "")}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-surface-elevated p-2 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-150">
          <div className="px-3 py-2">
            <p className="text-xs text-text-caption">
              {walletName ?? "Connected"}
            </p>
            <p className="mt-0.5 text-sm text-text-body font-mono">
              {truncateAddress(address ?? "", 6)}
            </p>
          </div>
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(address ?? "");
              setShowMenu(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-body transition-colors hover:bg-surface hover:text-text-heading"
          >
            Copy Address
          </button>
          <button
            onClick={async () => {
              await disconnect();
              setShowMenu(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-signal-error transition-colors hover:bg-signal-error/5"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
