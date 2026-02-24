/**
 * Calculates price impact for a swap based on pool liquidity.
 * Uses a simplified constant product formula approximation.
 *
 * @param amountIn - Amount being swapped (in token units)
 * @param poolLiquidity - Current pool liquidity
 * @returns Price impact as a percentage (0-100)
 */
export function calculatePriceImpact(
  amountIn: bigint,
  poolLiquidity: bigint
): number {
  if (poolLiquidity === 0n) return 100;
  if (amountIn === 0n) return 0;

  // Simplified approximation: impact ≈ (amountIn / poolLiquidity) * 100
  // This is a rough estimate for CLMM pools
  const impact = (Number(amountIn) / Number(poolLiquidity)) * 100;

  // Cap at 100%
  return Math.min(impact, 100);
}

/**
 * Returns the severity level of price impact for UI styling.
 */
export function getPriceImpactSeverity(impact: number): "low" | "medium" | "high" {
  if (impact < 0.5) return "low";
  if (impact < 1.5) return "medium";
  return "high";
}

/**
 * Returns badge variant based on price impact severity.
 * Maps to available Badge variants: "default" | "gold" | "error" | "success"
 */
export function getPriceImpactVariant(
  impact: number
): "success" | "default" | "error" {
  const severity = getPriceImpactSeverity(impact);

  switch (severity) {
    case "low":
      return "success";
    case "medium":
      return "default";
    case "high":
      return "error";
  }
}
