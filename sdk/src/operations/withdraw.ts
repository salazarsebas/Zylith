/** Withdraw operation: unshield tokens using membership proof */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import { u256Split } from "../utils/conversions.js";

export interface WithdrawParams {
  /** The note to withdraw. Must have a leafIndex. */
  noteCommitment: string;
  /** The recipient address to receive the withdrawn tokens */
  recipient: string;
}

export interface WithdrawResult {
  txHash: string;
  nullifierHash: string;
}

export async function withdraw(
  params: WithdrawParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<WithdrawResult> {
  const notes = noteManager.getAllNotes();
  const note = notes.find(
    (n) => n.commitment === params.noteCommitment && !n.spent,
  );
  if (!note) throw new Error("Note not found or already spent");
  if (note.leafIndex === undefined)
    throw new Error("Note has no leaf index (not deposited yet)");

  const { low, high } = u256Split(BigInt(note.amount));

  const response = await asp.withdraw({
    secret: note.secret,
    nullifier: note.nullifier,
    amount_low: low.toString(),
    amount_high: high.toString(),
    token: note.token,
    recipient: params.recipient,
    leaf_index: note.leafIndex,
  });

  noteManager.markSpent(note.nullifierHash);

  return {
    txHash: response.tx_hash,
    nullifierHash: response.nullifier_hash,
  };
}
