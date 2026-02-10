import { cn } from "@/lib/cn";
import { getToken } from "@/config/tokens";

interface TokenIconProps {
  address: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-7 w-7 text-xs",
  lg: "h-9 w-9 text-sm",
} as const;

export function TokenIcon({ address, size = "md", className }: TokenIconProps) {
  const token = getToken(address);
  const symbol = token?.symbol ?? "?";
  const initials = symbol.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface-elevated border border-border font-semibold text-text-caption",
        sizeMap[size],
        className
      )}
      title={token?.name ?? address}
    >
      {initials}
    </div>
  );
}
