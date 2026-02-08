/**
 * Burn circuit input generator.
 *
 * Circuit: burn.circom (wraps PrivateBurn from liquidity.circom)
 * Public: root, positionNullifierHash, newCommitment0, newCommitment1, tickLower, tickUpper (6)
 * No outputs.
 * Total public signals: 6
 *
 * Constraints:
 * - token0 < token1
 * - All 3 nullifiers distinct
 * - All secrets/nullifiers non-zero
 * - Position exists in Merkle tree
 */
import {
  computeCommitment,
  computePositionCommitment,
} from "../lib/commitment.mjs";
import { getSingleLeafProof } from "../lib/merkle.mjs";

const TICK_OFFSET = 887272;

export async function generateInput() {
  // Token addresses (token0 < token1)
  const token0 = "100";
  const token1 = "200";

  // Position to burn
  const positionSecret = "710000000000000000000000000001";
  const positionNullifier = "710000000000000000000000000002";
  const liquidity = "500000";
  const tickLower = String(TICK_OFFSET - 1000); // 886272
  const tickUpper = String(TICK_OFFSET + 1000); // 888272

  // Output note 0 (token0)
  const newSecret0 = "810000000000000000000000000001";
  const newNullifier0 = "810000000000000000000000000002";
  const amount0_low = "300000";
  const amount0_high = "0";

  // Output note 1 (token1)
  const newSecret1 = "910000000000000000000000000001";
  const newNullifier1 = "910000000000000000000000000002";
  const amount1_low = "600000";
  const amount1_high = "0";

  // Compute position commitment (leaf in tree)
  const { commitment: positionCommitmentValue, nullifierHash: positionNullifierHash } =
    computePositionCommitment(
      positionSecret,
      positionNullifier,
      tickLower,
      tickUpper,
      liquidity,
    );

  // Compute output note commitments
  const { commitment: newCommitment0 } = computeCommitment(
    newSecret0,
    newNullifier0,
    amount0_low,
    amount0_high,
    token0,
  );

  const { commitment: newCommitment1 } = computeCommitment(
    newSecret1,
    newNullifier1,
    amount1_low,
    amount1_high,
    token1,
  );

  // LeanIMT single leaf proof (position at index 0)
  const proof = getSingleLeafProof(positionCommitmentValue);

  return {
    // Public inputs
    root: proof.root,
    positionNullifierHash,
    newCommitment0,
    newCommitment1,
    tickLower,
    tickUpper,
    // Private - position
    positionSecret,
    positionNullifier,
    liquidity,
    pathElements: proof.pathElements,
    pathIndices: proof.pathIndices,
    // Private - output note 0
    newSecret0,
    newNullifier0,
    amount0_low,
    amount0_high,
    token0,
    // Private - output note 1
    newSecret1,
    newNullifier1,
    amount1_low,
    amount1_high,
    token1,
  };
}
