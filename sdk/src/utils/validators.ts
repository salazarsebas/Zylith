import { BN254_SCALAR_FIELD, MIN_TICK, MAX_TICK } from "../types/constants.js";

/** Validate a signed tick is within range */
export function validateTick(tick: number): void {
  if (!Number.isInteger(tick)) {
    throw new Error(`Invalid tick: ${tick}. Must be an integer.`);
  }
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error(
      `Invalid tick: ${tick}. Must be in range [${MIN_TICK}, ${MAX_TICK}]`,
    );
  }
}

/** Validate a tick range (lower < upper, both valid) */
export function validateTickRange(tickLower: number, tickUpper: number): void {
  validateTick(tickLower);
  validateTick(tickUpper);
  if (tickLower >= tickUpper) {
    throw new Error(
      `Invalid tick range: tickLower (${tickLower}) must be < tickUpper (${tickUpper})`,
    );
  }
}

/** Validate token ordering (token0 < token1 as bigints) */
export function validateTokenOrder(token0: string, token1: string): void {
  if (token0 === token1) {
    throw new Error("Tokens must be different");
  }
  if (BigInt(token0) >= BigInt(token1)) {
    throw new Error("Tokens must be ordered: token0 < token1");
  }
}

/** Validate a value fits in the BN254 scalar field */
export function validateFieldElement(value: bigint): void {
  if (value < 0n || value >= BN254_SCALAR_FIELD) {
    throw new Error(`Value exceeds BN254 scalar field`);
  }
}

/** Validate a positive amount that fits in u256 */
export function validateAmount(amount: bigint): void {
  if (amount <= 0n) {
    throw new Error("Amount must be positive");
  }
  if (amount >= 1n << 256n) {
    throw new Error("Amount exceeds u256 max");
  }
}
