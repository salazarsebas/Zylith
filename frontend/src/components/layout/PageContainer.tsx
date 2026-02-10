import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageContainerProps {
  children: ReactNode;
  size?: "narrow" | "default" | "wide";
  className?: string;
}

const sizeMap = {
  narrow: "max-w-[520px]",
  default: "max-w-[720px]",
  wide: "max-w-[960px]",
} as const;

export function PageContainer({ children, size = "default", className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto px-6 py-10", sizeMap[size], className)}>
      {children}
    </div>
  );
}
