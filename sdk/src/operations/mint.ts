/** Shielded mint (add liquidity) operation */
import type { AspClient } from "../asp/client.js";
import type { NoteManager } from "../storage/note-manager.js";
import type { PoolKey } from "../types/index.js";
import { u256Split, generateRandomSecret } from "../utils/conversions.js";

export interface MintParams {
  poolKey: PoolKey;
  inputNote0Commitment: string;
  inputNote1Commitment: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
}

export interface MintResult {
  txHash: string;
  positionCommitment: string;
  changeCommitment0: string;
  changeCommitment1: string;
}

export async function mint(
  params: MintParams,
  asp: AspClient,
  noteManager: NoteManager,
): Promise<MintResult> {
  const notes = noteManager.getAllNotes();
  const input0 = notes.find(
    (n) => n.commitment === params.inputNote0Commitment && !n.spent,
  );
  const input1 = notes.find(
    (n) => n.commitment === params.inputNote1Commitment && !n.spent,
  );
  if (!input0 || !input1) throw new Error("Input note(s) not found or spent");
  if (input0.leafIndex === undefined || input1.leafIndex === undefined)
    throw new Error("Input notes have no leaf index");

  const posSecret = generateRandomSecret();
  const posNullifier = generateRandomSecret();
  const change0Secret = generateRandomSecret();
  const change0Nullifier = generateRandomSecret();
  const change1Secret = generateRandomSecret();
  const change1Nullifier = generateRandomSecret();

  const { low: bal0Low, high: bal0High } = u256Split(BigInt(input0.amount));
  const { low: bal1Low, high: bal1High } = u256Split(BigInt(input1.amount));
  const { low: amt0Low, high: amt0High } = u256Split(params.amount0);
  const { low: amt1Low, high: amt1High } = u256Split(params.amount1);

  const response = await asp.mint({
    pool_key: {
      token_0: params.poolKey.token0,
      token_1: params.poolKey.token1,
      fee: params.poolKey.fee,
      tick_spacing: params.poolKey.tickSpacing,
    },
    input_note_0: {
      secret: input0.secret,
      nullifier: input0.nullifier,
      balance_low: bal0Low.toString(),
      balance_high: bal0High.toString(),
      token: input0.token,
      leaf_index: input0.leafIndex,
    },
    input_note_1: {
      secret: input1.secret,
      nullifier: input1.nullifier,
      balance_low: bal1Low.toString(),
      balance_high: bal1High.toString(),
      token: input1.token,
      leaf_index: input1.leafIndex,
    },
    position: {
      secret: posSecret,
      nullifier: posNullifier,
      liquidity: params.liquidity.toString(),
      tick_lower: params.tickLower,
      tick_upper: params.tickUpper,
    },
    amounts: {
      amount0_low: amt0Low.toString(),
      amount0_high: amt0High.toString(),
      amount1_low: amt1Low.toString(),
      amount1_high: amt1High.toString(),
    },
    change_note_0: { secret: change0Secret, nullifier: change0Nullifier },
    change_note_1: { secret: change1Secret, nullifier: change1Nullifier },
    liquidity: Number(params.liquidity),
  });

  // Update local state
  noteManager.markSpent(input0.nullifierHash);
  noteManager.markSpent(input1.nullifierHash);

  noteManager.addPositionNote({
    secret: posSecret,
    nullifier: posNullifier,
    tickLower: params.tickLower,
    tickUpper: params.tickUpper,
    liquidity: params.liquidity,
    commitment: response.position_commitment,
    txHash: response.tx_hash,
  });

  const change0Amount = BigInt(input0.amount) - params.amount0;
  if (change0Amount > 0n) {
    noteManager.addNote({
      secret: change0Secret,
      nullifier: change0Nullifier,
      amount: change0Amount,
      token: input0.token,
    });
  }
  const change1Amount = BigInt(input1.amount) - params.amount1;
  if (change1Amount > 0n) {
    noteManager.addNote({
      secret: change1Secret,
      nullifier: change1Nullifier,
      amount: change1Amount,
      token: input1.token,
    });
  }

  // Sync leaf indexes from ASP for change notes and position
  const commitmentsToSync = [
    response.change_commitment_0,
    response.change_commitment_1,
    response.position_commitment,
  ].filter((c) => c && c !== "0");

  if (commitmentsToSync.length > 0) {
    try {
      const syncResponse = await asp.syncCommitments(commitmentsToSync);
      noteManager.updateLeafIndexes(syncResponse);
    } catch (err) {
      console.warn("Failed to sync leaf indexes from ASP:", err);
    }
  }

  return {
    txHash: response.tx_hash,
    positionCommitment: response.position_commitment,
    changeCommitment0: response.change_commitment_0,
    changeCommitment1: response.change_commitment_1,
  };
}
