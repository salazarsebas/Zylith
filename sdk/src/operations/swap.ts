/** Shielded swap operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
import { u256Split, generateRandomSecret } from "../utils/conversions.js";

export interface SwapParams {
  poolKey: PoolKey;
  /** The commitment of the input note to spend */
  inputNoteCommitment: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  expectedAmountOut: bigint;
  sqrtPriceLimit: bigint;
}

export interface SwapResult {
  txHash: string;
  newCommitment: string;
  changeCommitment: string;
}

export async function swap(
  params: SwapParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<SwapResult> {
  const notes = noteManager.getAllNotes();
  const inputNote = notes.find(
    (n) => n.commitment === params.inputNoteCommitment && !n.spent,
  );
  if (!inputNote) throw new Error("Input note not found or already spent");
  if (inputNote.leafIndex === undefined)
    throw new Error("Input note has no leaf index");

  const outputSecret = generateRandomSecret();
  const outputNullifier = generateRandomSecret();
  const changeSecret = generateRandomSecret();
  const changeNullifier = generateRandomSecret();

  const { low: balLow, high: balHigh } = u256Split(BigInt(inputNote.amount));
  const { low: outLow, high: outHigh } = u256Split(params.expectedAmountOut);

  const response = await asp.swap({
    pool_key: {
      token_0: params.poolKey.token0,
      token_1: params.poolKey.token1,
      fee: params.poolKey.fee,
      tick_spacing: params.poolKey.tickSpacing,
    },
    input_note: {
      secret: inputNote.secret,
      nullifier: inputNote.nullifier,
      balance_low: balLow.toString(),
      balance_high: balHigh.toString(),
      token: params.tokenIn,
      leaf_index: inputNote.leafIndex,
    },
    swap_params: {
      token_in: params.tokenIn,
      token_out: params.tokenOut,
      amount_in: params.amountIn.toString(),
      amount_out_min: params.amountOutMin.toString(),
      amount_out_low: outLow.toString(),
      amount_out_high: outHigh.toString(),
    },
    output_note: { secret: outputSecret, nullifier: outputNullifier },
    change_note: { secret: changeSecret, nullifier: changeNullifier },
    sqrt_price_limit: "0x" + params.sqrtPriceLimit.toString(16),
  });

  // Update local state
  noteManager.markSpent(inputNote.nullifierHash);

  noteManager.addNote({
    secret: outputSecret,
    nullifier: outputNullifier,
    amount: params.expectedAmountOut,
    token: params.tokenOut,
  });

  const changeAmount = BigInt(inputNote.amount) - params.amountIn;
  if (changeAmount > 0n) {
    noteManager.addNote({
      secret: changeSecret,
      nullifier: changeNullifier,
      amount: changeAmount,
      token: params.tokenIn,
    });
  }

  return {
    txHash: response.tx_hash,
    newCommitment: response.new_commitment,
    changeCommitment: response.change_commitment,
  };
}
