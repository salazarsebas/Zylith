/** Input generator for the swap circuit */
import { computeCommitment } from "../../crypto/commitment.js";
import { u256Split } from "../../utils/conversions.js";
import type { MerkleProof } from "../../crypto/merkle.js";

export interface SwapCircuitInputs {
  // Public
  root: string;
  nullifierHash: string;
  newCommitment: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
  // Private - input note
  secret: string;
  nullifier: string;
  balance_low: string;
  balance_high: string;
  pathElements: string[];
  pathIndices: number[];
  // Private - output note
  newSecret: string;
  newNullifier: string;
  amountOut_low: string;
  amountOut_high: string;
  // Private - change note
  changeSecret: string;
  changeNullifier: string;
}

/** Build circuit inputs for a swap proof */
export function generateSwapInputs(params: {
  inputNote: {
    secret: string;
    nullifier: string;
    balance: bigint;
    token: string;
    merkleProof: MerkleProof;
  };
  outputNote: {
    secret: string;
    nullifier: string;
    amount: bigint;
    token: string;
  };
  changeNote: { secret: string; nullifier: string };
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOutMin: string;
}): SwapCircuitInputs {
  const { inputNote, outputNote, changeNote } = params;

  // Compute input nullifier hash
  const { low: balLow, high: balHigh } = u256Split(inputNote.balance);
  const { nullifierHash } = computeCommitment(
    inputNote.secret,
    inputNote.nullifier,
    balLow.toString(),
    balHigh.toString(),
    inputNote.token,
  );

  // Compute output commitment
  const { low: outLow, high: outHigh } = u256Split(outputNote.amount);
  const { commitment: newCommitment } = computeCommitment(
    outputNote.secret,
    outputNote.nullifier,
    outLow.toString(),
    outHigh.toString(),
    outputNote.token,
  );

  return {
    root: inputNote.merkleProof.root,
    nullifierHash,
    newCommitment,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    amountOutMin: params.amountOutMin,
    secret: inputNote.secret,
    nullifier: inputNote.nullifier,
    balance_low: balLow.toString(),
    balance_high: balHigh.toString(),
    pathElements: inputNote.merkleProof.pathElements,
    pathIndices: inputNote.merkleProof.pathIndices,
    newSecret: outputNote.secret,
    newNullifier: outputNote.nullifier,
    amountOut_low: outLow.toString(),
    amountOut_high: outHigh.toString(),
    changeSecret: changeNote.secret,
    changeNullifier: changeNote.nullifier,
  };
}
