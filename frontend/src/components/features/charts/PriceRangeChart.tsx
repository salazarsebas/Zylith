import { useMemo } from "react";
import { motion } from "motion/react";
import { createTickScale } from "@/lib/charts";
import type { PositionNote } from "@zylith/sdk";

interface PriceRangeChartProps {
  position: PositionNote;
  currentTick: number;
  className?: string;
}

/**
 * Visualizes a position's price range relative to the current pool tick.
 * Shows whether the position is in-range or out-of-range.
 */
export function PriceRangeChart({
  position,
  currentTick,
  className = "",
}: PriceRangeChartProps) {
  const chartWidth = 400;
  const chartHeight = 100;
  const padding = 40;

  const { tickLower, tickUpper } = position;

  // Add 20% padding to tick range for better visualization
  const tickRange = tickUpper - tickLower;
  const visualMin = tickLower - tickRange * 0.2;
  const visualMax = tickUpper + tickRange * 0.2;

  const scale = useMemo(
    () => createTickScale(visualMin, visualMax, chartWidth, padding),
    [visualMin, visualMax, chartWidth]
  );

  const rangeStart = scale(tickLower);
  const rangeEnd = scale(tickUpper);
  const rangeWidth = rangeEnd - rangeStart;
  const currentTickPos = scale(currentTick);

  const inRange = currentTick >= tickLower && currentTick <= tickUpper;

  return (
    <div
      className={`rounded-xl border border-white/5 bg-gradient-to-br from-surface-elevated/80 to-surface/30 p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-text-caption mb-1">
            Price Range Status
          </p>
          <p
            className={`text-lg font-bold ${
              inRange ? "text-signal-success" : "text-text-disabled"
            }`}
          >
            {inRange ? "✓ In Range" : "— Out of Range"}
          </p>
        </div>
      </div>

      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="overflow-visible"
      >
        {/* Position range bar */}
        <motion.rect
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          x={rangeStart}
          y={chartHeight / 2 - 15}
          width={rangeWidth}
          height={30}
          rx={6}
          fill={inRange ? "rgba(34, 197, 94, 0.2)" : "rgba(161, 161, 170, 0.2)"}
          stroke={inRange ? "rgba(34, 197, 94, 0.5)" : "rgba(161, 161, 170, 0.5)"}
          strokeWidth={2}
        />

        {/* Lower tick marker */}
        <motion.line
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          x1={rangeStart}
          y1={chartHeight / 2 - 25}
          x2={rangeStart}
          y2={chartHeight / 2 + 25}
          stroke="rgba(201, 169, 76, 0.6)"
          strokeWidth={2}
          strokeDasharray="4,4"
        />

        {/* Upper tick marker */}
        <motion.line
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          x1={rangeEnd}
          y1={chartHeight / 2 - 25}
          x2={rangeEnd}
          y2={chartHeight / 2 + 25}
          stroke="rgba(201, 169, 76, 0.6)"
          strokeWidth={2}
          strokeDasharray="4,4"
        />

        {/* Current tick indicator */}
        <motion.line
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          x1={currentTickPos}
          y1={chartHeight / 2 - 35}
          x2={currentTickPos}
          y2={chartHeight / 2 + 35}
          stroke={inRange ? "#22C55E" : "#A1A1AA"}
          strokeWidth={3}
        />

        {/* Current tick arrow */}
        <motion.polygon
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          points={`${currentTickPos},${chartHeight / 2 - 40} ${currentTickPos - 5},${
            chartHeight / 2 - 48
          } ${currentTickPos + 5},${chartHeight / 2 - 48}`}
          fill={inRange ? "#22C55E" : "#A1A1AA"}
        />

        {/* Labels */}
        <text
          x={rangeStart}
          y={chartHeight / 2 + 50}
          fill="rgba(201, 169, 76, 0.8)"
          fontSize={11}
          fontWeight="600"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {tickLower}
        </text>

        <text
          x={rangeEnd}
          y={chartHeight / 2 + 50}
          fill="rgba(201, 169, 76, 0.8)"
          fontSize={11}
          fontWeight="600"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {tickUpper}
        </text>

        <text
          x={currentTickPos}
          y={chartHeight / 2 - 52}
          fill={inRange ? "#22C55E" : "#A1A1AA"}
          fontSize={11}
          fontWeight="700"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {currentTick}
        </text>
      </svg>

      <p className="text-xs text-text-caption mt-3 italic">
        {inRange
          ? "Position is earning fees from swaps"
          : "Move current price into range to earn fees"}
      </p>
    </div>
  );
}
