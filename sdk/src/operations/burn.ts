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

  // Update local state
  noteManager.markSpent(position.nullifierHash);

  if (params.amount0Out > 0n) {
    noteManager.addNote({
      secret: out0Secret,
      nullifier: out0Nullifier,
      amount: params.amount0Out,
      token: params.token0,
    });
  }
  if (params.amount1Out > 0n) {
    noteManager.addNote({
      secret: out1Secret,
      nullifier: out1Nullifier,
      amount: params.amount1Out,
      token: params.token1,
    });
  }

  return {
    txHash: response.tx_hash,
    newCommitment0: response.new_commitment_0,
    newCommitment1: response.new_commitment_1,
  };
}
