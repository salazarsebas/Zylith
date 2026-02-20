/**
 * Commitment computation matching circuits/common/commitment.circom.
 *
 * ZylithCommitment:
 *   innerHash = Poseidon(secret, nullifier)
 *   nullifierHash = Poseidon(nullifier)
 *   commitment = Poseidon(innerHash, amount_low, amount_high, token)
 *
 * ZylithPositionCommitment:
 *   nullifierHash = Poseidon(nullifier)
 *   commitment = Poseidon(secret, nullifier, tickLower, tickUpper, liquidity)
 */
import { hash } from "./poseidon.js";

export interface NoteCommitmentResult {
  commitment: string;
  nullifierHash: string;
  innerHash: string;
}

export interface PositionCommitmentResult {
  commitment: string;
  nullifierHash: string;
}

/**
 * Compute a note commitment and nullifier hash.
 * All inputs should be decimal strings or BigInts.
 * Returns { commitment, nullifierHash, innerHash } as decimal strings.
 */
export function computeCommitment(
  secret: string | bigint,
  nullifier: string | bigint,
  amountLow: string | bigint,
  amountHigh: string | bigint,
  token: string | bigint,
): NoteCommitmentResult {
  const innerHash = hash([secret, nullifier]);
  const nullifierHash = hash([nullifier]);
  const commitment = hash([innerHash, amountLow, amountHigh, token]);

  return { commitment, nullifierHash, innerHash };
}

/**
 * Compute a position commitment and nullifier hash.
 * Returns { commitment, nullifierHash } as decimal strings.
 *
 * IMPORTANT: Uses UNSIGNED (offset) ticks for commitment calculation,
 * matching the circuit and ASP backend behavior.
 */
export function computePositionCommitment(
  secret: string | bigint,
  nullifier: string | bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: string | bigint,
): PositionCommitmentResult {
  // Convert signed ticks to unsigned (offset) ticks for circuit compatibility
  const TICK_OFFSET = 887272;
  const tickLowerUnsigned = tickLower + TICK_OFFSET;
  const tickUpperUnsigned = tickUpper + TICK_OFFSET;

  const nullifierHash = hash([nullifier]);
  const commitment = hash([secret, nullifier, tickLowerUnsigned, tickUpperUnsigned, liquidity]);

  return { commitment, nullifierHash };
}
