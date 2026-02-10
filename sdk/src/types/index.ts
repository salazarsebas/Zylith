/** Pool key uniquely identifies a pool (matches Cairo PoolKey + FeeTier) */
export interface PoolKey {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
}

/** Pool state (matches Cairo PoolState) */
export interface PoolState {
  sqrtPrice: bigint;
  tick: number;
  liquidity: bigint;
  feeGrowthGlobal0: bigint;
  feeGrowthGlobal1: bigint;
  protocolFees0: bigint;
  protocolFees1: bigint;
}

/** LP position (matches Cairo Position) */
export interface Position {
  liquidity: bigint;
  feeGrowthInside0Last: bigint;
  feeGrowthInside1Last: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

/** Circuit types supported by Zylith */
export type CircuitType = "membership" | "swap" | "mint" | "burn";

/** Proving mode for the SDK */
export type ProvingMode = "asp" | "client-side";
