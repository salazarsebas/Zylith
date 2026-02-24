import { cn } from "@/lib/cn";
import { motion } from "motion/react";

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("relative flex gap-2 p-1 bg-surface-elevated/50 backdrop-blur-md rounded-2xl border border-white/5", className)}>
      {items.map((item) => {
        const isActive = value === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative px-6 py-3 text-sm font-bold tracking-widest uppercase transition-colors duration-300 z-10 w-full rounded-xl",
              isActive ? "text-gold" : "text-text-caption hover:text-text-body"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {isActive && (
              <motion.span
                layoutId="bubble"
                className="absolute inset-0 z-[-1] bg-surface border border-white/10 shadow-[0_0_15px_rgba(201,169,78,0.15)] rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
