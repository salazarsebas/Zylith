import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import { TokenIcon } from "./TokenIcon";
import { getTokenSymbol } from "@/config/tokens";

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  tokenAddress?: string;
  balance?: string;
  error?: string;
  label?: string;
  onMax?: () => void;
  onTokenClick?: () => void;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ tokenAddress, balance, error, label, onMax, onTokenClick, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold tracking-wide text-text-caption uppercase">{label}</span>
            {balance !== undefined && (
              <span className="text-xs font-medium text-text-disabled">
                Balance: <span className="text-text-body">{balance}</span>
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            "group flex items-center rounded-2xl border bg-surface/40 backdrop-blur-xl transition-all duration-300",
            "focus-within:bg-surface/60 focus-within:border-gold/50 focus-within:shadow-[0_0_20px_rgba(201,169,78,0.1)]",
            error ? "border-signal-error" : "border-white/5 hover:border-white/10",
            className
          )}
        >
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="h-16 flex-1 bg-transparent px-5 text-2xl font-bold text-text-display placeholder:text-text-disabled/40 focus:outline-none"
            {...props}
          />
          <div className="flex items-center gap-3 pr-4">
            {onMax && (
              <button
                type="button"
                onClick={onMax}
                className="rounded-lg px-2.5 py-1 text-xs font-bold tracking-widest text-gold hover:bg-gold/10 hover:text-gold-light transition-colors"
              >
                MAX
              </button>
            )}
            {tokenAddress && (
              <button
                type="button"
                onClick={onTokenClick}
                disabled={!onTokenClick}
                className={cn(
                  "flex items-center gap-2 rounded-xl bg-surface-elevated/80 border border-white/5 shadow-inner px-3 py-1.5 transition-all duration-300",
                  onTokenClick && "cursor-pointer hover:border-gold/30 hover:bg-surface-elevated",
                  !onTokenClick && "cursor-default opacity-80"
                )}
              >
                <div className="p-0.5 bg-surface rounded-full shadow-sm">
                  <TokenIcon address={tokenAddress} size="sm" />
                </div>
                <span className="text-base font-bold text-text-heading">
                  {getTokenSymbol(tokenAddress)}
                </span>
                {onTokenClick && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-caption ml-1">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-signal-error pl-1">{error}</p>}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
