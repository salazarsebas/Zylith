/**
 * D3 chart utilities for visualizing pool and position data.
 * Used for liquidity depth and price range charts.
 */

import { scaleLinear } from "d3-scale";

/**
 * Creates a linear scale for tick values.
 * Maps tick range to pixel positions.
 */
export function createTickScale(
  tickLower: number,
  tickUpper: number,
  width: number,
  padding = 20
) {
  return scaleLinear()
    .domain([tickLower, tickUpper])
    .range([padding, width - padding]);
}

/**
 * Creates a linear scale for liquidity values.
 * Maps liquidity amounts to visual heights/widths.
 */
export function createLiquidityScale(
  maxLiquidity: bigint,
  height: number,
  padding = 20
) {
  return scaleLinear()
    .domain([0, Number(maxLiquidity)])
    .range([0, height - padding * 2]);
}

/**
 * Formats large numbers with K/M/B suffixes for chart labels.
 */
export function formatChartNumber(value: number | bigint): string {
  const num = typeof value === "bigint" ? Number(value) : value;

  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(0);
}

/**
 * Generates tick marks for chart axes.
 * Returns array of evenly spaced tick values.
 */
export function generateTicks(min: number, max: number, count = 5): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

/**
 * Clamps a value between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Interpolates between two colors based on a progress value (0-1).
 * Returns RGB color string.
 */
export function interpolateColor(
  color1: string,
  color2: string,
  progress: number
): string {
  // Simple linear interpolation for hex colors
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * progress);
  const g = Math.round(g1 + (g2 - g1) * progress);
  const b = Math.round(b1 + (b2 - b1) * progress);

  return `rgb(${r}, ${g}, ${b})`;
}
