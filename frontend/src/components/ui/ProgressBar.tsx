import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
}

export function ProgressBar({ value = 0, indeterminate, className }: ProgressBarProps) {
  return (
    <div className={cn("h-0.5 w-full overflow-hidden rounded-full bg-border", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gold transition-all duration-300 ease-out",
          indeterminate && "animate-progress-indeterminate w-1/3"
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
