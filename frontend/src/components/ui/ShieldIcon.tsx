import { cn } from "@/lib/cn";

interface ShieldIconProps {
  size?: number;
  className?: string;
}

export function ShieldIcon({ size = 16, className }: ShieldIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={cn("text-text-caption", className)}
    >
      <path
        d="M8 1.5L2.5 4v4c0 3.5 2.3 5.6 5.5 6.5 3.2-.9 5.5-3 5.5-6.5V4L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8l1.5 1.5L10 6.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
