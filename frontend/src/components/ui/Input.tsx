import { type InputHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-caption"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-12 w-full rounded-lg border bg-surface px-4 text-sm text-text-display placeholder:text-text-disabled transition-colors duration-150",
              "focus:outline-none",
              error
                ? "border-signal-error focus:border-signal-error"
                : "border-border focus:border-gold",
              suffix && "pr-16",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-signal-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
