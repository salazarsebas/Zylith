#!/usr/bin/env node

/**
 * End-to-end proof generation pipeline for Zylith circuits.
 *
 * Usage:
 *   node scripts/generate_proofs.mjs                     # All circuits
 *   node scripts/generate_proofs.mjs --circuit membership # Single circuit
 *   node scripts/generate_proofs.mjs --skip-garaga        # Skip calldata
 *   node scripts/generate_proofs.mjs --verify-only        # Local verify only
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { initPoseidon } from "./lib/poseidon.mjs";
import { generateProof, exportProofArtifacts } from "./lib/prover.mjs";
import { generateCalldata, isGaragaAvailable } from "./lib/garaga.mjs";

import { generateInput as membershipInput } from "./inputs/membership.mjs";
import { generateInput as swapInput } from "./inputs/swap.mjs";
import { generateInput as mintInput } from "./inputs/mint.mjs";
import { generateInput as burnInput } from "./inputs/burn.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(__dirname, "../build");

const CIRCUITS = {
  membership: { generator: membershipInput, publicCount: 2 },
  swap: { generator: swapInput, publicCount: 8 },
  mint: { generator: mintInput, publicCount: 8 },
  burn: { generator: burnInput, publicCount: 6 },
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    circuit: args.includes("--circuit")
      ? args[args.indexOf("--circuit") + 1]
      : null,
    skipGaraga: args.includes("--skip-garaga"),
    verifyOnly: args.includes("--verify-only"),
  };
}

async function processCircuit(name, config, options) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Circuit: ${name}`);
  console.log(`${"=".repeat(60)}\n`);

  // Step 1: Generate input
  console.log("[1/4] Generating circuit inputs...");
  const input = await config.generator();
  const inputKeys = Object.keys(input);
  console.log(`      Signals: ${inputKeys.length} keys`);

  // Save input.json for reference
  const inputPath = path.join(BUILD_DIR, name, "input.json");
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
  console.log(`      Saved: ${inputPath}`);

  // Step 2: Generate proof
  console.log("[2/4] Generating witness and Groth16 proof...");
  const { proof, publicSignals, verified } = await generateProof(name, input);
  console.log(`      Local verification: ${verified ? "PASS" : "FAIL"}`);
  console.log(`      Public signals: ${publicSignals.length} (expected ${config.publicCount})`);

  if (publicSignals.length !== config.publicCount) {
    console.error(
      `      WARNING: Expected ${config.publicCount} public signals, got ${publicSignals.length}`,
    );
  }

  // Print public signals (truncated)
  for (let i = 0; i < publicSignals.length; i++) {
    const val = publicSignals[i];
    const display = val.length > 40 ? val.substring(0, 40) + "..." : val;
    console.log(`      [${i}]: ${display}`);
  }

  if (options.verifyOnly) {
    console.log("\n      --verify-only: skipping export and calldata");
    return true;
  }

  // Step 3: Export artifacts
  console.log("[3/4] Exporting proof artifacts...");
  const { proofPath, publicPath } = exportProofArtifacts(
    name,
    proof,
    publicSignals,
  );
  console.log(`      Proof:  ${proofPath}`);
  console.log(`      Public: ${publicPath}`);

  // Step 4: Garaga calldata
  if (options.skipGaraga) {
    console.log("[4/4] Skipped (--skip-garaga)");
  } else if (!options.garagaAvailable) {
    console.log("[4/4] Skipped (garaga CLI not found, install: pip install garaga)");
  } else {
    console.log("[4/4] Generating Garaga calldata...");
    const success = generateCalldata(name);
    console.log(`      Calldata: ${success ? "PASS" : "FAIL"}`);
    if (!success) return false;
  }

  return true;
}

async function main() {
  const options = parseArgs();

  console.log("Zylith E2E Proof Pipeline");
  console.log("=".repeat(60));

  // Initialize Poseidon (async, one time)
  console.log("Initializing Poseidon (BN128)...");
  await initPoseidon();
  console.log("Poseidon ready.");

  // Check garaga availability
  if (!options.skipGaraga && !options.verifyOnly) {
    options.garagaAvailable = isGaragaAvailable();
    if (!options.garagaAvailable) {
      console.log("WARNING: garaga CLI not found. Install: pip install garaga");
      console.log("         Calldata generation will be skipped.");
    }
  }

  // Select circuits to process
  const circuitNames = options.circuit
    ? [options.circuit]
    : Object.keys(CIRCUITS);

  for (const name of circuitNames) {
    if (!CIRCUITS[name]) {
      console.error(`Unknown circuit: ${name}`);
      process.exit(1);
    }
  }

  let allPassed = true;
  for (const name of circuitNames) {
    try {
      const passed = await processCircuit(name, CIRCUITS[name], options);
      if (!passed) allPassed = false;
    } catch (err) {
      console.error(`\nFATAL [${name}]: ${err.message}`);
      if (err.stack) console.error(err.stack);
      allPassed = false;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(allPassed ? "  All circuits PASSED" : "  Some circuits FAILED");
  console.log("=".repeat(60));

  if (!allPassed) process.exit(1);
}

main();
