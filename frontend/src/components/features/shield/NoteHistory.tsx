import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { motion, AnimatePresence } from "motion/react";

interface HistoryItem {
  txHash: string;
  type: "deposit" | "withdraw";
  token: string;
  amount?: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = "zylith_note_history";
const MAX_HISTORY_ITEMS = 10;

/**
 * Displays transaction history for deposits (shields) and withdrawals (unshields).
 * Loads from localStorage and provides links to Voyager explorer.
 */
export function NoteHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Load history from localStorage
    // Consolidate from both deposit and withdraw storage keys
    const depositHistory = localStorage.getItem("zylith_recent_deposits");
    const withdrawHistory = localStorage.getItem("zylith_recent_withdrawals");

    const allHistory: HistoryItem[] = [];

    if (depositHistory) {
      try {
        const deposits = JSON.parse(depositHistory);
        deposits.forEach((d: any) => {
          allHistory.push({
            txHash: d.txHash,
            type: "deposit",
            token: d.token,
            amount: d.amount,
            timestamp: d.timestamp,
          });
        });
      } catch (e) {
        console.error("Failed to parse deposit history:", e);
      }
    }

    if (withdrawHistory) {
      try {
        const withdrawals = JSON.parse(withdrawHistory);
        withdrawals.forEach((w: any) => {
          allHistory.push({
            txHash: w.txHash,
            type: "withdraw",
            token: w.token,
            amount: w.amount,
            timestamp: w.timestamp,
          });
        });
      } catch (e) {
        console.error("Failed to parse withdraw history:", e);
      }
    }

    // Sort by timestamp (newest first) and limit to MAX_HISTORY_ITEMS
    allHistory.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(allHistory.slice(0, MAX_HISTORY_ITEMS));

    // Save consolidated history
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(allHistory.slice(0, MAX_HISTORY_ITEMS)));
  }, []);

  if (history.length === 0) {
    return (
      <Card className="p-6 text-center bg-surface/40 backdrop-blur-xl border-white/5">
        <p className="text-sm text-text-disabled">
          No transaction history yet. Shield or unshield tokens to see your activity.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-surface/40 backdrop-blur-xl border-white/5">
      <h3 className="text-lg font-bold text-text-display mb-4">Transaction History</h3>

      <div className="space-y-3">
        <AnimatePresence>
          {history.map((item, index) => (
            <motion.div
              key={`${item.txHash}-${index}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-surface-elevated/50 border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.type === "deposit"
                      ? "bg-signal-success/20 text-signal-success"
                      : "bg-gold/20 text-gold"
                  }`}
                >
                  {item.type === "deposit" ? "↓" : "↑"}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={item.type === "deposit" ? "success" : "gold"} className="text-xs">
                      {item.type === "deposit" ? "Shield" : "Unshield"}
                    </Badge>
                    <span className="text-xs text-text-caption">
                      {item.token}
                    </span>
                  </div>
                  <p className="text-xs text-text-disabled">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <a
                href={`https://sepolia.voyager.online/tx/${item.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-gold hover:text-white transition-colors"
              >
                Voyager
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-xs text-text-caption mt-4 text-center italic">
        Showing last {history.length} transaction{history.length !== 1 ? "s" : ""}
      </p>
    </Card>
  );
}
