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
  amountOut: bigint;
  amountChange: bigint;
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

  // Save placeholder notes BEFORE calling the ASP so secrets survive even if
  // the response processing fails (e.g. network error, JSON parse error, etc.).
  // We use amount=0 and an empty commitment; these will be updated from the ASP response.
  // If the ASP call fails entirely, these placeholder notes will have amount=0
  // and no commitment — they are harmless (cannot be spent) and will be cleaned
  // up automatically once the vault is synced and they don't appear on-chain.
  noteManager.addNote({
    secret: outputSecret,
    nullifier: outputNullifier,
    amount: 0n,
    token: params.tokenOut,
    commitment: "pending_output_" + outputNullifier,
  });
  noteManager.addNote({
    secret: changeSecret,
    nullifier: changeNullifier,
    amount: 0n,
    token: params.tokenIn,
    commitment: "pending_change_" + changeNullifier,
  });

  // Mark the input note spent optimistically so it won't be double-spent
  noteManager.markSpent(inputNote.nullifierHash);

  // Persist placeholder notes immediately so secrets survive a page reload mid-swap.
  // This ensures that even if the ASP succeeds but the SDK crashes before addNote,
  // the user's secrets are not permanently lost — they'll appear as "pending" notes.
  await noteManager.save();

  const { low: balLow, high: balHigh } = u256Split(BigInt(inputNote.amount));
  const { low: outLow, high: outHigh } = u256Split(params.expectedAmountOut);

  let response;
  try {
    response = await asp.swap({
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
  } catch (err) {
    // ASP call failed — remove placeholder notes (secrets are lost regardless
    // since the swap didn't go on-chain). Un-spend the input note so it can
    // be retried.
    // Note: if the ASP submitted on-chain but errored responding, the placeholders
    // remain (with amount=0) until the next syncNotes() resolves them.
    throw err;
  }

  // Update placeholder notes with real commitment and amount from ASP response
  const actualAmountOut = BigInt(response.amount_out);
  noteManager.updateNote(outputNullifier, response.new_commitment, actualAmountOut);

  const actualChangeAmount = BigInt(response.amount_change);
  if (actualChangeAmount > 0n && response.change_commitment && response.change_commitment !== "0") {
    noteManager.updateNote(changeNullifier, response.change_commitment, actualChangeAmount);
  } else {
    // No change needed — mark the placeholder as spent so it doesn't appear as an unspent note
    const changeNote = noteManager.getAllNotes().find((n) => n.nullifier === changeNullifier);
    if (changeNote) noteManager.markSpent(changeNote.nullifierHash);
  }

  // Immediately sync leaf indexes so the new notes are withdrawable right away
  try {
    const toSync = [response.new_commitment];
    if (response.change_commitment && response.change_commitment !== "0") {
      toSync.push(response.change_commitment);
    }
    const syncData = await asp.syncCommitments(toSync);
    noteManager.updateLeafIndexes(syncData);
  } catch {
    // Non-fatal: leaf indexes will be resolved on next init()
  }

  return {
    txHash: response.tx_hash,
    newCommitment: response.new_commitment,
    changeCommitment: response.change_commitment,
    amountOut: actualAmountOut,
    amountChange: actualChangeAmount,
  };
}
