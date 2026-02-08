/**
 * Membership circuit input generator.
 *
 * Circuit: membership.circom
 * Public: root, nullifierHash (2 signals)
 * Private: secret, nullifier, amount_low, amount_high, token, pathElements[20], pathIndices[20]
 *
 * Uses single leaf at index 0 with all-zero siblings (LeanIMT: root = leaf).
 */
import { computeCommitment } from "../lib/commitment.mjs";
import { getSingleLeafProof } from "../lib/merkle.mjs";

export async function generateInput() {
  // Note components (arbitrary non-zero values)
  const secret = "123456789012345678901234567890";
  const nullifier = "987654321098765432109876543210";
  const amount_low = "1000000"; // 1M tokens (low 128 bits)
  const amount_high = "0";
  const token = "0xABCDEF0123456789";

  // Compute commitment and nullifier hash
  const { commitment, nullifierHash } = computeCommitment(
    secret,
    nullifier,
    amount_low,
    amount_high,
    token,
  );

  // LeanIMT: single leaf at index 0, all-zero siblings => root = commitment
  const proof = getSingleLeafProof(commitment);

  return {
    // Public inputs
    root: proof.root,
    nullifierHash,
    // Private inputs
    secret,
    nullifier,
    amount_low,
    amount_high,
    token,
    pathElements: proof.pathElements,
    pathIndices: proof.pathIndices,
  };
}
