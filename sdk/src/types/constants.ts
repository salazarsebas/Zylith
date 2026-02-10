/** Merkle tree height (2^20 = 1,048,576 max leaves) */
export const TREE_HEIGHT = 20;

/** Maximum number of leaves in the Merkle tree */
export const MAX_LEAVES = 2 ** TREE_HEIGHT;

/**
 * Tick offset for converting signed ticks to unsigned in Circom circuits.
 * Circom circuits use unsigned ticks: offset_tick = signed_tick + TICK_OFFSET
 */
export const TICK_OFFSET = 887272;

/** Maximum valid unsigned tick after offset (2 * TICK_OFFSET) */
export const MAX_TICK_OFFSET = 1774544;

/** Minimum signed tick value */
export const MIN_TICK = -TICK_OFFSET;

/** Maximum signed tick value */
export const MAX_TICK = TICK_OFFSET;

/** Number of public inputs for each circuit (from Garaga N_PUBLIC_INPUTS) */
export const PUBLIC_INPUT_COUNTS = {
  membership: 2,
  swap: 8,
  mint: 8,
  burn: 6,
} as const;

/** Standard fee tiers in basis points */
export const FEE_TIERS = {
  /** 0.05% fee, tick spacing 10 */
  LOW: { fee: 500, tickSpacing: 10 },
  /** 0.30% fee, tick spacing 60 */
  MEDIUM: { fee: 3000, tickSpacing: 60 },
  /** 1.00% fee, tick spacing 200 */
  HIGH: { fee: 10000, tickSpacing: 200 },
} as const;

/** BN254 scalar field modulus (for validation) */
export const BN254_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Convert signed tick to unsigned offset tick (for circuit inputs) */
export function signedToOffsetTick(signedTick: number): number {
  return signedTick + TICK_OFFSET;
}

/** Convert unsigned offset tick from circuit to signed tick */
export function offsetToSignedTick(offsetTick: number): number {
  return offsetTick - TICK_OFFSET;
}
