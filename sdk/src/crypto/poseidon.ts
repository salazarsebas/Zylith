/**
 * BN128 Poseidon hash wrapper using circomlibjs.
 *
 * This uses the BN254 scalar field (~2^254), NOT the Stark field (~2^251).
 * All Zylith commitments, nullifier hashes, and Merkle tree operations
 * use this hash function to match the Circom circuits.
 */
import { buildPoseidon } from "circomlibjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _poseidon: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _F: any = null;

/** Initialize the Poseidon hash function. Must be called before any hashing. */
export async function initPoseidon(): Promise<void> {
  if (!_poseidon) {
    _poseidon = await buildPoseidon();
    _F = _poseidon.F;
  }
}

/** Hash an array of inputs using Poseidon. Returns a decimal string. */
export function hash(inputs: (string | bigint | number)[]): string {
  if (!_poseidon) throw new Error("Call initPoseidon() first");
  const result = _poseidon(inputs.map((x: string | bigint | number) => _F.e(x)));
  return _F.toString(result, 10);
}

/** Check if Poseidon has been initialized */
export function isInitialized(): boolean {
  return _poseidon !== null;
}
