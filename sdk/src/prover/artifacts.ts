/** Circuit artifact path resolution for client-side proving */
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

export type CircuitName = "membership" | "swap" | "mint" | "burn";

export interface CircuitArtifacts {
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
}

const SDK_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ARTIFACTS_DIR = join(SDK_ROOT, "artifacts");

/** Get paths to circuit build artifacts (WASM, zkey, verification key) */
export function getCircuitArtifacts(circuit: CircuitName): CircuitArtifacts {
  const dir = join(ARTIFACTS_DIR, circuit);
  return {
    wasmPath: join(dir, `${circuit}_js`, `${circuit}.wasm`),
    zkeyPath: join(dir, `${circuit}_0000.zkey`),
    vkeyPath: join(dir, "verification_key.json"),
  };
}
