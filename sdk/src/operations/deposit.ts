/** Deposit operation: shield tokens into the privacy pool */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import { computeCommitment } from "../crypto/commitment.js";
import { u256Split, decimalToHex } from "../utils/conversions.js";

export interface DepositParams {
  secret: string;
  nullifier: string;
  amount: bigint;
  token: string;
}

export interface DepositResult {
  txHash: string;
  leafIndex: number;
  commitment: string;
  root: string;
  rootTxHash: string;
}

export async function deposit(
  params: DepositParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<DepositResult> {
  const { low, high } = u256Split(params.amount);
  const { commitment } = computeCommitment(
    params.secret,
    params.nullifier,
    low.toString(),
    high.toString(),
    params.token,
  );

  const response = await asp.deposit({
    commitment: decimalToHex(commitment),
  });

  const note = noteManager.addNote({
    secret: params.secret,
    nullifier: params.nullifier,
    amount: params.amount,
    token: params.token,
    leafIndex: response.leaf_index,
  });

  // Leaf index might already be set by addNote, but ensure from response
  noteManager.setLeafIndex(note.commitment, response.leaf_index);

  return {
    txHash: response.tx_hash,
    leafIndex: response.leaf_index,
    commitment,
    root: response.root,
    rootTxHash: response.root_tx_hash,
  };
}
