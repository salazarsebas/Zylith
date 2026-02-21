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
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-caption">{label}</span>
            {balance !== undefined && (
              <span className="text-xs text-text-caption">
                Balance: {balance}
              </span>
            )}
          </div>
        )}
        <div
          className={cn(
            "flex items-center rounded-lg border bg-surface transition-colors duration-150",
            "focus-within:border-gold",
            error ? "border-signal-error" : "border-border",
            className
          )}
        >
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="h-14 flex-1 bg-transparent px-4 text-lg font-medium text-text-display placeholder:text-text-disabled focus:outline-none"
            {...props}
          />
          <div className="flex items-center gap-2 pr-3">
            {onMax && (
              <button
                type="button"
                onClick={onMax}
                className="rounded px-1.5 py-0.5 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
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
                  "flex items-center gap-1.5 rounded-full bg-surface-elevated border border-border px-2.5 py-1",
                  onTokenClick && "cursor-pointer hover:border-gold hover:bg-gold/5 transition-colors",
                  !onTokenClick && "cursor-default"
                )}
              >
                <TokenIcon address={tokenAddress} size="sm" />
                <span className="text-sm font-medium text-text-heading">
                  {getTokenSymbol(tokenAddress)}
                </span>
                {onTokenClick && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-caption">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-signal-error">{error}</p>}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
