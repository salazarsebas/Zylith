/**
 * snarkjs proof generation and local verification.
 */
import * as snarkjs from "snarkjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(__dirname, "../../build");

/**
 * Generate a Groth16 proof for the given circuit and input signals.
 * Also verifies the proof locally.
 *
 * @param {string} circuitName - Circuit name (membership, swap, mint, burn)
 * @param {object} inputSignals - Circuit input signals
 * @returns {{ proof, publicSignals, verified }}
 */
export async function generateProof(circuitName, inputSignals) {
  const wasmPath = path.join(
    BUILD_DIR,
    circuitName,
    `${circuitName}_js`,
    `${circuitName}.wasm`,
  );
  const zkeyPath = path.join(
    BUILD_DIR,
    circuitName,
    `${circuitName}_0000.zkey`,
  );
  const vkPath = path.join(BUILD_DIR, circuitName, "verification_key.json");

  // Verify build artifacts exist
  for (const [label, p] of [
    ["wasm", wasmPath],
    ["zkey", zkeyPath],
    ["vk", vkPath],
  ]) {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing ${label} artifact: ${p}`);
    }
  }

  // Generate witness + proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputSignals,
    wasmPath,
    zkeyPath,
  );

  // Local verification
  const vk = JSON.parse(fs.readFileSync(vkPath, "utf8"));
  const verified = await snarkjs.groth16.verify(vk, publicSignals, proof);

  if (!verified) {
    throw new Error(`Local verification FAILED for ${circuitName}`);
  }

  return { proof, publicSignals, verified };
}

/**
 * Export proof and public signals to JSON files in the build directory.
 * These are needed by `garaga calldata`.
 */
export function exportProofArtifacts(circuitName, proof, publicSignals) {
  const outputDir = path.join(BUILD_DIR, circuitName);

  const proofPath = path.join(outputDir, "proof.json");
  const publicPath = path.join(outputDir, "public.json");

  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));

  return { proofPath, publicPath };
}
