/**
 * Client-side Groth16 proof generation using snarkjs.
 * Generates proofs locally without needing the ASP server.
 *
 * Note: This generates a Groth16 proof but NOT Garaga calldata.
 * For on-chain submission, use ASP mode which handles calldata generation.
 */
import * as snarkjs from "snarkjs";
import { readFile, access } from "fs/promises";
import type { CircuitName } from "./artifacts.js";
import { getCircuitArtifacts } from "./artifacts.js";

export interface ProofResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proof: any;
  publicSignals: string[];
}

export class ClientProver {
  /** Generate a Groth16 proof and verify it locally */
  async generateProof(
    circuit: CircuitName,
    inputs: Record<string, unknown>,
  ): Promise<ProofResult> {
    const artifacts = getCircuitArtifacts(circuit);

    // Verify artifacts exist
    for (const path of [
      artifacts.wasmPath,
      artifacts.zkeyPath,
      artifacts.vkeyPath,
    ]) {
      await access(path).catch(() => {
        throw new Error(
          `Missing circuit artifact: ${path}. Run 'npm run copy-artifacts' first.`,
        );
      });
    }

    // Generate witness + proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs as snarkjs.CircuitSignals,
      artifacts.wasmPath,
      artifacts.zkeyPath,
    );

    // Local verification
    const vkeyJson = await readFile(artifacts.vkeyPath, "utf8");
    const vkey = JSON.parse(vkeyJson);
    const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    if (!verified) {
      throw new Error(`Local proof verification failed for ${circuit}`);
    }

    return { proof, publicSignals };
  }
}
