/**
 * Mint circuit input generator.
 *
 * Circuit: mint.circom (wraps PrivateMint from liquidity.circom)
 * Public: root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper (6)
 * Output: changeCommitment0, changeCommitment1 (2)
 * Total public signals: 8 [changeCommitment0, changeCommitment1, root, nullifierHash0, nullifierHash1, positionCommitment, tickLower, tickUpper]
 *
 * Constraints:
 * - token0 < token1
 * - tickLower < tickUpper (both in [0, 1774544])
 * - amount0 <= balance0, amount1 <= balance1
 * - All 5 nullifiers distinct
 * - Both input notes in same Merkle tree (2-leaf tree)
 */
import {
  computeCommitment,
  computePositionCommitment,
} from "../lib/commitment.mjs";
import { MerkleTree } from "../lib/merkle.mjs";

const TICK_OFFSET = 887272;

export async function generateInput() {
  // Token addresses (token0 < token1 required)
  const token0 = "100";
  const token1 = "200";

  // Input note 0: token0 with balance 1,000,000
  const secret0 = "110000000000000000000000000001";
  const nullifier0 = "110000000000000000000000000002";
  const balance0_low = "1000000";
  const balance0_high = "0";

  // Input note 1: token1 with balance 2,000,000
  const secret1 = "220000000000000000000000000001";
  const nullifier1 = "220000000000000000000000000002";
  const balance1_low = "2000000";
  const balance1_high = "0";

  // Position parameters
  const positionSecret = "330000000000000000000000000001";
  const positionNullifier = "330000000000000000000000000002";
  const liquidity = "500000";
  const tickLower = String(TICK_OFFSET - 1000); // tick -1000 -> 886272
  const tickUpper = String(TICK_OFFSET + 1000); // tick +1000 -> 888272

  // Amounts used for minting
  const amount0_low = "300000";
  const amount0_high = "0";
  const amount1_low = "600000";
  const amount1_high = "0";

  // Change note secrets
  const changeSecret0 = "440000000000000000000000000001";
  const changeNullifier0 = "440000000000000000000000000002";
  const changeSecret1 = "550000000000000000000000000001";
  const changeNullifier1 = "550000000000000000000000000002";

  // Compute commitments for input notes
  const { commitment: commitment0, nullifierHash: nullifierHash0 } =
    computeCommitment(secret0, nullifier0, balance0_low, balance0_high, token0);

  const { commitment: commitment1, nullifierHash: nullifierHash1 } =
    computeCommitment(secret1, nullifier1, balance1_low, balance1_high, token1);

  // Compute position commitment
  const { commitment: positionCommitment } = computePositionCommitment(
    positionSecret,
    positionNullifier,
    tickLower,
    tickUpper,
    liquidity,
  );

  // Build 2-leaf Merkle tree for both input notes
  const tree = new MerkleTree();
  tree.insert(commitment0);
  tree.insert(commitment1);

  const proof0 = tree.getProof(0);
  const proof1 = tree.getProof(1);

  // Both proofs should share the same root
  if (proof0.root !== proof1.root) {
    throw new Error("Merkle roots don't match for 2-leaf tree");
  }

  return {
    // Public inputs
    root: proof0.root,
    nullifierHash0,
    nullifierHash1,
    positionCommitment,
    tickLower,
    tickUpper,
    // Private - input note 0
    secret0,
    nullifier0,
    balance0_low,
    balance0_high,
    token0,
    pathElements0: proof0.pathElements,
    pathIndices0: proof0.pathIndices,
    // Private - input note 1
    secret1,
    nullifier1,
    balance1_low,
    balance1_high,
    token1,
    pathElements1: proof1.pathElements,
    pathIndices1: proof1.pathIndices,
    // Private - position
    positionSecret,
    positionNullifier,
    liquidity,
    amount0_low,
    amount0_high,
    amount1_low,
    amount1_high,
    // Private - change notes
    changeSecret0,
    changeNullifier0,
    changeSecret1,
    changeNullifier1,
  };
}
