import { cn } from "@/lib/cn";

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
    <div className={cn("flex gap-1 border-b border-border", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "relative px-4 py-2.5 text-sm font-medium transition-colors duration-150",
            value === item.value
              ? "text-text-display"
              : "text-text-caption hover:text-text-body"
          )}
        >
          {item.label}
          {value === item.value && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gold rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
