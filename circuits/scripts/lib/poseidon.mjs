/**
 * Poseidon hash wrapper using circomlibjs (BN128 field).
 * Singleton pattern to avoid rebuilding poseidon on each call.
 */
import { buildPoseidon } from "circomlibjs";

let _poseidon = null;
let _F = null;

export async function initPoseidon() {
  if (!_poseidon) {
    _poseidon = await buildPoseidon();
    _F = _poseidon.F;
  }
  return { poseidon: _poseidon, F: _F };
}

/** Hash an array of inputs using Poseidon. Returns a field element. */
export function hash(inputs) {
  if (!_poseidon) throw new Error("Call initPoseidon() first");
  return _poseidon(inputs.map((x) => _F.e(x)));
}

/** Convert a field element to a decimal string. */
export function toStr(fieldElement) {
  return _F.toString(fieldElement, 10);
}

/** Convert a value (BigInt, string, number) to a field element. */
export function toFe(value) {
  return _F.e(value);
}

/** Get the field object for direct operations. */
export function getF() {
  if (!_F) throw new Error("Call initPoseidon() first");
  return _F;
}
