/** Shielded burn (remove liquidity) operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
import { u256Split, generateRandomSecret } from "../utils/conversions.js";

export interface BurnParams {
  poolKey: PoolKey;
  positionCommitment: string;
  amount0Out: bigint;
  token0: string;
  amount1Out: bigint;
  token1: string;
  liquidity: bigint;
}

export interface BurnResult {
  txHash: string;
  newCommitment0: string;
  newCommitment1: string;
  amount0: bigint;
  amount1: bigint;
}

export async function burn(
  params: BurnParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<BurnResult> {
  const positions = noteManager.getAllPositions();
  const position = positions.find(
    (p) => p.commitment === params.positionCommitment && !p.spent,
  );
  if (!position) throw new Error("Position not found or already spent");
  if (position.leafIndex === undefined)
    throw new Error("Position has no leaf index");

  const out0Secret = generateRandomSecret();
  const out0Nullifier = generateRandomSecret();
  const out1Secret = generateRandomSecret();
  const out1Nullifier = generateRandomSecret();

  const { low: out0Low, high: out0High } = u256Split(params.amount0Out);
  const { low: out1Low, high: out1High } = u256Split(params.amount1Out);

  // Save placeholder notes BEFORE calling the ASP so secrets survive even if
  // the response processing fails. Same pattern as swap.ts.
  noteManager.addNote({
    secret: out0Secret,
    nullifier: out0Nullifier,
    amount: 0n,
    token: params.token0,
    commitment: "pending_burn0_" + out0Nullifier,
  });
  noteManager.addNote({
    secret: out1Secret,
    nullifier: out1Nullifier,
    amount: 0n,
    token: params.token1,
    commitment: "pending_burn1_" + out1Nullifier,
  });

  // Mark position spent optimistically
  noteManager.markSpent(position.nullifierHash);
  await noteManager.save();

  const response = await asp.burn({
    pool_key: {
      token_0: params.poolKey.token0,
      token_1: params.poolKey.token1,
      fee: params.poolKey.fee,
      tick_spacing: params.poolKey.tickSpacing,
    },
    position_note: {
      secret: position.secret,
      nullifier: position.nullifier,
      liquidity: position.liquidity,
      tick_lower: position.tickLower,
      tick_upper: position.tickUpper,
      leaf_index: position.leafIndex,
    },
    output_note_0: {
      secret: out0Secret,
      nullifier: out0Nullifier,
      amount_low: out0Low.toString(),
      amount_high: out0High.toString(),
      token: params.token0,
    },
    output_note_1: {
      secret: out1Secret,
      nullifier: out1Nullifier,
      amount_low: out1Low.toString(),
      amount_high: out1High.toString(),
      token: params.token1,
    },
    liquidity: Number(params.liquidity),
  });

  // Update placeholder notes with real commitments and amounts from ASP response.
  // The ASP echoes back the amounts it used in the ZK proof — these are authoritative.
  const actual0 = BigInt(response.amount_0);
  if (actual0 > 0n) {
    noteManager.updateNote(out0Nullifier, response.new_commitment_0, actual0);
  }

  const actual1 = BigInt(response.amount_1);
  if (actual1 > 0n) {
    noteManager.updateNote(out1Nullifier, response.new_commitment_1, actual1);
  }

  // Sync leaf indexes from ASP for output notes
  const commitmentsToSync = [
    response.new_commitment_0,
    response.new_commitment_1,
  ].filter((c) => c && c !== "0");

  if (commitmentsToSync.length > 0) {
    try {
      const syncResponse = await asp.syncCommitments(commitmentsToSync);
      noteManager.updateLeafIndexes(syncResponse);
    } catch {
      // Non-fatal: leaf indexes will be resolved on next syncNotes()
    }
  }

  return {
    txHash: response.tx_hash,
    newCommitment0: response.new_commitment_0,
    newCommitment1: response.new_commitment_1,
    amount0: actual0,
    amount1: actual1,
  };
}
