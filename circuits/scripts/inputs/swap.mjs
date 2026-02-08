/**
 * Swap circuit input generator.
 *
 * Circuit: swap.circom
 * Public: root, nullifierHash, newCommitment, tokenIn, tokenOut, amountIn, amountOutMin (7)
 * Output: changeCommitment (1)
 * Total public signals: 8 [changeCommitment, root, nullifierHash, newCommitment, tokenIn, tokenOut, amountIn, amountOutMin]
 *
 * Constraints:
 * - amountIn <= balance_low (when balance_high == 0)
 * - amountOut_low >= amountOutMin (when amountOut_high == 0)
 * - tokenIn != tokenOut
 * - All 3 nullifiers distinct
 * - All secrets/nullifiers non-zero
 */
import { computeCommitment } from "../lib/commitment.mjs";
import { getSingleLeafProof } from "../lib/merkle.mjs";

export async function generateInput() {
  // Input note: tokenIn with balance 1,000,000
  const secret = "111111111111111111111111111111";
  const nullifier = "222222222222222222222222222222";
  const balance_low = "1000000";
  const balance_high = "0";
  const tokenIn = "100";
  const tokenOut = "200";

  // Swap parameters
  const amountIn = "100000"; // Swap 100k
  const amountOutMin = "95000"; // 5% slippage tolerance
  const amountOut_low = "98000"; // Actually received
  const amountOut_high = "0";

  // Output note secrets
  const newSecret = "333333333333333333333333333333";
  const newNullifier = "444444444444444444444444444444";

  // Change note secrets
  const changeSecret = "555555555555555555555555555555";
  const changeNullifier = "666666666666666666666666666666";

  // Compute commitments
  const { commitment: inputCommitment, nullifierHash } = computeCommitment(
    secret,
    nullifier,
    balance_low,
    balance_high,
    tokenIn,
  );

  const { commitment: newCommitment } = computeCommitment(
    newSecret,
    newNullifier,
    amountOut_low,
    amountOut_high,
    tokenOut,
  );

  // LeanIMT single leaf proof
  const proof = getSingleLeafProof(inputCommitment);

  return {
    // Public inputs
    root: proof.root,
    nullifierHash,
    newCommitment,
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin,
    // Private inputs - input note
    secret,
    nullifier,
    balance_low,
    balance_high,
    pathElements: proof.pathElements,
    pathIndices: proof.pathIndices,
    // Private inputs - output note
    newSecret,
    newNullifier,
    amountOut_low,
    amountOut_high,
    // Private inputs - change note
    changeSecret,
    changeNullifier,
  };
}
