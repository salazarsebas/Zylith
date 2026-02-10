import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedKey,
  emptyMessage = "No data",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "pb-3 text-left font-medium text-text-caption",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-text-disabled"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const key = keyExtractor(row);
              const isSelected = key === selectedKey;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border/50 transition-colors duration-100",
                    onRowClick && "cursor-pointer hover:bg-surface-elevated",
                    isSelected && "border-l-2 border-l-gold bg-surface-elevated",
                    i % 2 === 1 && !isSelected && "bg-surface/50"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("py-3 pr-4", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
