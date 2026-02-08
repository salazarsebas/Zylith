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
import { hash, toStr } from "./poseidon.mjs";

/**
 * Compute a note commitment and nullifier hash.
 * All inputs should be decimal strings or BigInts.
 * Returns { commitment, nullifierHash, innerHash } as decimal strings.
 */
export function computeCommitment(
  secret,
  nullifier,
  amount_low,
  amount_high,
  token,
) {
  const innerHash = hash([secret, nullifier]);
  const nullifierHash = hash([nullifier]);
  const commitment = hash([innerHash, amount_low, amount_high, token]);

  return {
    commitment: toStr(commitment),
    nullifierHash: toStr(nullifierHash),
    innerHash: toStr(innerHash),
  };
}

/**
 * Compute a position commitment and nullifier hash.
 * Returns { commitment, nullifierHash } as decimal strings.
 */
export function computePositionCommitment(
  secret,
  nullifier,
  tickLower,
  tickUpper,
  liquidity,
) {
  const nullifierHash = hash([nullifier]);
  const commitment = hash([secret, nullifier, tickLower, tickUpper, liquidity]);

  return {
    commitment: toStr(commitment),
    nullifierHash: toStr(nullifierHash),
  };
}
