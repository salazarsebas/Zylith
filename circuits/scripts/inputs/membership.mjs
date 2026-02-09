/**
 * Membership circuit input generator.
 *
 * Circuit: membership.circom
 * Public: root, nullifierHash (2 signals)
 * Private: secret, nullifier, amount_low, amount_high, token, pathElements[20], pathIndices[20]
 *
 * Supports two modes:
 * - Default (no params): uses hardcoded test values with single-leaf LeanIMT tree
 * - Parameterized: accepts note components and Merkle proof for real on-chain use
 *
 * @param {Object} [params] - Optional parameters to override defaults
 * @param {string} [params.secret] - Note secret
 * @param {string} [params.nullifier] - Note nullifier
 * @param {string} [params.amount_low] - Low 128 bits of amount
 * @param {string} [params.amount_high] - High 128 bits of amount
 * @param {string} [params.token] - Token contract address
 * @param {Object} [params.merkleProof] - Pre-computed Merkle proof { pathElements, pathIndices, root }
 */
import { computeCommitment } from "../lib/commitment.mjs";
import { getSingleLeafProof } from "../lib/merkle.mjs";

export async function generateInput(params = {}) {
  // Note components (use provided values or defaults)
  const secret = params.secret || "123456789012345678901234567890";
  const nullifier = params.nullifier || "987654321098765432109876543210";
  const amount_low = params.amount_low || "1000000"; // 1M tokens (low 128 bits)
  const amount_high = params.amount_high || "0";
  const token = params.token || "0xABCDEF0123456789";

  // Compute commitment and nullifier hash
  const { commitment, nullifierHash } = computeCommitment(
    secret,
    nullifier,
    amount_low,
    amount_high,
    token,
  );

  // Use provided Merkle proof or default single-leaf LeanIMT proof
  const proof = params.merkleProof || getSingleLeafProof(commitment);

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
