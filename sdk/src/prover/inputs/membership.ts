/** Input generator for the membership circuit */
import { computeCommitment } from "../../crypto/commitment.js";
import { u256Split } from "../../utils/conversions.js";
import type { MerkleProof } from "../../crypto/merkle.js";

export interface MembershipCircuitInputs {
  root: string;
  nullifierHash: string;
  secret: string;
  nullifier: string;
  amount_low: string;
  amount_high: string;
  token: string;
  pathElements: string[];
  pathIndices: number[];
}

/** Build circuit inputs for a membership proof (withdrawal) */
export function generateMembershipInputs(
  secret: string,
  nullifier: string,
  amount: bigint,
  token: string,
  merkleProof: MerkleProof,
): MembershipCircuitInputs {
  const { low, high } = u256Split(amount);
  const { nullifierHash } = computeCommitment(
    secret,
    nullifier,
    low.toString(),
    high.toString(),
    token,
  );

  return {
    root: merkleProof.root,
    nullifierHash,
    secret,
    nullifier,
    amount_low: low.toString(),
    amount_high: high.toString(),
    token,
    pathElements: merkleProof.pathElements,
    pathIndices: merkleProof.pathIndices,
  };
}
