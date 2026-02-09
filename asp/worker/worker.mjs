/**
 * Zylith ASP Worker
 *
 * Long-lived Bun process that communicates with the Rust ASP server via NDJSON
 * over stdin/stdout. Handles Merkle tree operations, commitment computation,
 * and Groth16 proof generation using the existing circuits pipeline.
 *
 * Spawned by Rust with: bun run worker/worker.mjs
 */
import { createInterface } from "readline";
import { MerkleTree } from "../../circuits/scripts/lib/merkle.mjs";
import {
  computeCommitment,
  computePositionCommitment,
} from "../../circuits/scripts/lib/commitment.mjs";
import {
  generateProof,
  exportProofArtifacts,
} from "../../circuits/scripts/lib/prover.mjs";
import {
  generateCalldata,
  isGaragaAvailable,
} from "../../circuits/scripts/lib/garaga.mjs";
import { initPoseidon } from "../../circuits/scripts/lib/poseidon.mjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GARAGA_DIR = path.resolve(__dirname, "../../garaga_verifiers");
const BUILD_DIR = path.resolve(__dirname, "../../circuits/build");

// In-memory Merkle tree (rebuilt from leaves on build_tree command)
let tree = new MerkleTree();

// Send JSON response to Rust via stdout
function respond(data) {
  process.stdout.write(JSON.stringify(data) + "\n");
}

// Handle a single command from Rust
async function handleCommand(msg) {
  const { id, command, params } = msg;

  try {
    switch (command) {
      case "build_tree": {
        tree = new MerkleTree();
        for (const leaf of params.leaves) {
          tree.insert(String(leaf));
        }
        const root = tree.getRoot();
        respond({ id, ok: true, data: { root } });
        break;
      }

      case "insert_leaf": {
        tree.insert(String(params.leaf));
        const root = tree.getRoot();
        respond({ id, ok: true, data: { root } });
        break;
      }

      case "get_root": {
        const root = tree.getRoot();
        respond({ id, ok: true, data: { root } });
        break;
      }

      case "get_proof": {
        const proof = tree.getProof(params.leafIndex);
        respond({
          id,
          ok: true,
          data: {
            pathElements: proof.pathElements,
            pathIndices: proof.pathIndices,
            root: proof.root,
          },
        });
        break;
      }

      case "compute_commitment": {
        const result = computeCommitment(
          params.secret,
          params.nullifier,
          params.amount_low,
          params.amount_high,
          params.token,
        );
        respond({
          id,
          ok: true,
          data: {
            commitment: result.commitment,
            nullifierHash: result.nullifierHash,
          },
        });
        break;
      }

      case "compute_position_commitment": {
        const result = computePositionCommitment(
          params.secret,
          params.nullifier,
          params.tickLower,
          params.tickUpper,
          params.liquidity,
        );
        respond({
          id,
          ok: true,
          data: {
            commitment: result.commitment,
            nullifierHash: result.nullifierHash,
          },
        });
        break;
      }

      case "generate_proof": {
        const { circuit, inputs } = params;

        // 1. Generate Groth16 proof via snarkjs
        const { proof, publicSignals, verified } = await generateProof(
          circuit,
          inputs,
        );

        if (!verified) {
          respond({
            id,
            ok: false,
            error: `Local verification failed for ${circuit}`,
          });
          return;
        }

        // 2. Export proof artifacts (needed by garaga)
        exportProofArtifacts(circuit, proof, publicSignals);

        // 3. Generate Garaga calldata
        if (!isGaragaAvailable()) {
          respond({ id, ok: false, error: "garaga CLI not available" });
          return;
        }

        const calldataGenerated = generateCalldata(circuit);
        if (!calldataGenerated) {
          respond({
            id,
            ok: false,
            error: `garaga calldata generation failed for ${circuit}`,
          });
          return;
        }

        // 4. Read calldata from file
        const calldataPath = path.join(
          GARAGA_DIR,
          `${circuit}_verifier`,
          "tests",
          "proof_calldata.txt",
        );
        const calldataRaw = fs.readFileSync(calldataPath, "utf8").trim();
        const calldata = calldataRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        respond({
          id,
          ok: true,
          data: {
            calldata,
            publicSignals,
          },
        });
        break;
      }

      case "ping": {
        respond({ id, ok: true, data: { pong: true } });
        break;
      }

      default:
        respond({ id, ok: false, error: `Unknown command: ${command}` });
    }
  } catch (err) {
    respond({ id, ok: false, error: err.message || String(err) });
  }
}

// Main: initialize Poseidon, then start reading NDJSON from stdin
(async () => {
  await initPoseidon();

  const rl = createInterface({ input: process.stdin });

  // Send ready signal AFTER Poseidon is initialized
  respond({ ready: true });

  rl.on("line", async (line) => {
    try {
      const msg = JSON.parse(line);
      await handleCommand(msg);
    } catch (err) {
      respond({
        id: "unknown",
        ok: false,
        error: `Parse error: ${err.message}`,
      });
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });
})();
