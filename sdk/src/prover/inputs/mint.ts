/** Input generator for the mint circuit */
import { computeCommitment, computePositionCommitment } from "../../crypto/commitment.js";
import { u256Split } from "../../utils/conversions.js";
import { signedToOffsetTick } from "../../types/constants.js";
import type { MerkleProof } from "../../crypto/merkle.js";

export interface MintCircuitInputs {
  // Public (8: 2 outputs + 6 inputs)
  root: string;
  nullifierHash0: string;
  nullifierHash1: string;
  positionCommitment: string;
  tickLower: string;
  tickUpper: string;
  // Private - input note 0
  secret0: string;
  nullifier0: string;
  balance0_low: string;
  balance0_high: string;
  token0: string;
  pathElements0: string[];
  pathIndices0: number[];
  // Private - input note 1
  secret1: string;
  nullifier1: string;
  balance1_low: string;
  balance1_high: string;
  token1: string;
  pathElements1: string[];
  pathIndices1: number[];
  // Private - position
  positionSecret: string;
  positionNullifier: string;
  liquidity: string;
  // Private - change notes
  changeSecret0: string;
  changeNullifier0: string;
  changeSecret1: string;
  changeNullifier1: string;
}

/** Build circuit inputs for a mint proof */
export function generateMintInputs(params: {
  inputNote0: {
    secret: string;
    nullifier: string;
    balance: bigint;
    token: string;
    merkleProof: MerkleProof;
  };
  inputNote1: {
    secret: string;
    nullifier: string;
    balance: bigint;
    token: string;
    merkleProof: MerkleProof;
  };
  position: {
    secret: string;
    nullifier: string;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint;
  };
  changeNote0: { secret: string; nullifier: string };
  changeNote1: { secret: string; nullifier: string };
}): MintCircuitInputs {
  const { inputNote0, inputNote1, position, changeNote0, changeNote1 } =
    params;

  // Compute nullifier hashes
  const { low: bal0Low, high: bal0High } = u256Split(inputNote0.balance);
  const { nullifierHash: nullifierHash0 } = computeCommitment(
    inputNote0.secret,
    inputNote0.nullifier,
    bal0Low.toString(),
    bal0High.toString(),
    inputNote0.token,
  );
  const { low: bal1Low, high: bal1High } = u256Split(inputNote1.balance);
  const { nullifierHash: nullifierHash1 } = computeCommitment(
    inputNote1.secret,
    inputNote1.nullifier,
    bal1Low.toString(),
    bal1High.toString(),
    inputNote1.token,
  );

  // Compute position commitment with unsigned ticks
  const unsignedTickLower = signedToOffsetTick(position.tickLower);
  const unsignedTickUpper = signedToOffsetTick(position.tickUpper);
  const { commitment: positionCommitment } = computePositionCommitment(
    position.secret,
    position.nullifier,
    unsignedTickLower,
    unsignedTickUpper,
    position.liquidity.toString(),
  );

  return {
    root: inputNote0.merkleProof.root,
    nullifierHash0,
    nullifierHash1,
    positionCommitment,
    tickLower: unsignedTickLower.toString(),
    tickUpper: unsignedTickUpper.toString(),
    secret0: inputNote0.secret,
    nullifier0: inputNote0.nullifier,
    balance0_low: bal0Low.toString(),
    balance0_high: bal0High.toString(),
    token0: inputNote0.token,
    pathElements0: inputNote0.merkleProof.pathElements,
    pathIndices0: inputNote0.merkleProof.pathIndices,
    secret1: inputNote1.secret,
    nullifier1: inputNote1.nullifier,
    balance1_low: bal1Low.toString(),
    balance1_high: bal1High.toString(),
    token1: inputNote1.token,
    pathElements1: inputNote1.merkleProof.pathElements,
    pathIndices1: inputNote1.merkleProof.pathIndices,
    positionSecret: position.secret,
    positionNullifier: position.nullifier,
    liquidity: position.liquidity.toString(),
    changeSecret0: changeNote0.secret,
    changeNullifier0: changeNote0.nullifier,
    changeSecret1: changeNote1.secret,
    changeNullifier1: changeNote1.nullifier,
  };
}
