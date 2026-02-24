import type { PositionNote } from "@zylith/sdk";

/**
 * Checks if a position is currently in range (earning fees).
 *
 * @param position - The position note to check
 * @param currentTick - Current pool tick
 * @returns true if position is in range
 */
export function isPositionInRange(
  position: PositionNote,
  currentTick: number
): boolean {
  return currentTick >= position.tickLower && currentTick <= position.tickUpper;
}

/**
 * Returns the status badge variant for a position.
 */
export function getPositionStatusVariant(
  position: PositionNote,
  currentTick: number
): "success" | "default" {
  return isPositionInRange(position, currentTick) ? "success" : "default";
}

/**
 * Returns the status text for a position.
 */
export function getPositionStatusText(
  position: PositionNote,
  currentTick: number
): string {
  return isPositionInRange(position, currentTick) ? "✓ In Range" : "— Out of Range";
}

/**
 * Calculates how far the current tick is from the position range.
 * Returns negative if below range, positive if above, 0 if in range.
 */
export function getTickDistance(
  position: PositionNote,
  currentTick: number
): number {
  if (currentTick < position.tickLower) {
    return currentTick - position.tickLower;
  }
  if (currentTick > position.tickUpper) {
    return currentTick - position.tickUpper;
  }
  return 0;
}
