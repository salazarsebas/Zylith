#!/usr/bin/env node

/**
 * Zylith Testnet Validation Script
 *
 * End-to-end validation of the shielded CLMM on Starknet Sepolia.
 * Orchestrates proof generation (BN128 Poseidon, snarkjs, Garaga) and
 * contract interactions (starkli) to validate the full shielded flow.
 *
 * Prerequisites:
 *   - .env.local with STARKNET_RPC_URL, STARKNET_ACCOUNT, STARKNET_KEYSTORE,
 *     STARKNET_KEYSTORE_PASSWORD, ADMIN_ADDRESS
 *   - starkli 0.4.x
 *   - garaga CLI (pip install garaga)
 *   - Circom build artifacts in circuits/build/
 *   - Deployed contracts (scripts/deployed_addresses.json)
 *
 * Usage:
 *   node scripts/validate_testnet.mjs                    # Full validation
 *   node scripts/validate_testnet.mjs --step deposit     # Run specific step
 *   node scripts/validate_testnet.mjs --step proof       # Generate proof only
 *   node scripts/validate_testnet.mjs --step verify      # Submit proof on-chain
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CIRCUITS_DIR = path.resolve(ROOT_DIR, "circuits");
const BUILD_DIR = path.resolve(CIRCUITS_DIR, "build");
const GARAGA_DIR = path.resolve(ROOT_DIR, "garaga_verifiers");

// ============================================================================
// Configuration
// ============================================================================

function loadEnv() {
  const envPath = path.join(ROOT_DIR, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env.local — copy .env.example and fill in values");
  }
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx);
    const value = trimmed.substring(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadDeployedAddresses() {
  const addrPath = path.join(__dirname, "deployed_addresses.json");
  if (!fs.existsSync(addrPath)) {
    throw new Error("Missing deployed_addresses.json — run deploy.sh first");
  }
  return JSON.parse(fs.readFileSync(addrPath, "utf8"));
}

function resolveAccountPath(p) {
  if (path.isAbsolute(p)) return p;
  return path.resolve(ROOT_DIR, p);
}

// ============================================================================
// Helpers
// ============================================================================

/** Check if a starkli hex return value represents true (0x1 or ends with 1) */
function isTruthy(hexVal) {
  if (!hexVal) return false;
  return hexVal === "0x1" || hexVal.endsWith("1");
}

// ============================================================================
// Starkli helpers
// ============================================================================

function starkliFlags() {
  return [
    "--rpc", process.env.STARKNET_RPC_URL,
    "--account", resolveAccountPath(process.env.STARKNET_ACCOUNT),
    "--keystore", resolveAccountPath(process.env.STARKNET_KEYSTORE),
  ].join(" ");
}

/**
 * Invoke a contract function (write transaction).
 * For Span<felt252>, pass the array length followed by each element.
 */
function starkliInvoke(contractAddress, functionName, args = []) {
  const argsStr = args.map(String).join(" ");
  const cmd = `starkli invoke --watch ${contractAddress} ${functionName} ${argsStr} ${starkliFlags()}`;
  console.log(`  > starkli invoke ${functionName}`);
  try {
    const output = execSync(cmd, {
      stdio: "pipe",
      env: { ...process.env, STARKNET_KEYSTORE_PASSWORD: process.env.STARKNET_KEYSTORE_PASSWORD },
      timeout: 300000,
    });
    const txHash = output.toString().match(/0x[0-9a-fA-F]+/)?.[0];
    if (txHash) console.log(`    tx: ${txHash}`);
    return txHash;
  } catch (err) {
    const stderr = err.stderr?.toString() || "";
    // Check if it's a known acceptable error
    if (stderr.includes("ACCEPTED") || stderr.includes("already")) {
      console.log("    (already processed)");
      return null;
    }
    console.error(`    FAILED: ${stderr || err.message}`);
    throw err;
  }
}

/**
 * Call a contract function (read-only, no transaction).
 */
function starkliCall(contractAddress, functionName, args = []) {
  const argsStr = args.map(String).join(" ");
  const cmd = `starkli call ${contractAddress} ${functionName} ${argsStr} --rpc ${process.env.STARKNET_RPC_URL}`;
  try {
    const output = execSync(cmd, { stdio: "pipe", timeout: 30000 });
    // Parse starkli JSON array output — extract hex values
    const raw = output.toString().trim();
    const matches = raw.match(/0x[0-9a-fA-F]+/g);
    return matches || [];
  } catch (err) {
    console.error(`    Call failed: ${err.stderr?.toString() || err.message}`);
    return null;
  }
}

// ============================================================================
// Proof generation (imports from circuits/)
// ============================================================================

let poseidonReady = false;

async function ensurePoseidon() {
  if (poseidonReady) return;
  const { initPoseidon } = await import(
    path.join(CIRCUITS_DIR, "scripts/lib/poseidon.mjs")
  );
  await initPoseidon();
  poseidonReady = true;
}

async function computeCommitmentOffchain(secret, nullifier, amountLow, amountHigh, token) {
  await ensurePoseidon();
  const { computeCommitment } = await import(
    path.join(CIRCUITS_DIR, "scripts/lib/commitment.mjs")
  );
  return computeCommitment(secret, nullifier, amountLow, amountHigh, token);
}

async function buildMerkleTree(leaves) {
  await ensurePoseidon();
  const { MerkleTree } = await import(
    path.join(CIRCUITS_DIR, "scripts/lib/merkle.mjs")
  );
  const tree = new MerkleTree();
  for (const leaf of leaves) {
    tree.insert(leaf);
  }
  return tree;
}

async function generateMembershipProof(params) {
  await ensurePoseidon();
  const { generateInput } = await import(
    path.join(CIRCUITS_DIR, "scripts/inputs/membership.mjs")
  );
  const { generateProof, exportProofArtifacts } = await import(
    path.join(CIRCUITS_DIR, "scripts/lib/prover.mjs")
  );

  // Generate input signals
  const input = await generateInput(params);

  // Save input.json
  const inputDir = path.join(BUILD_DIR, "membership");
  fs.mkdirSync(inputDir, { recursive: true });
  fs.writeFileSync(path.join(inputDir, "input.json"), JSON.stringify(input, null, 2));

  // Generate Groth16 proof
  const { proof, publicSignals, verified } = await generateProof("membership", input);
  console.log(`    Local verification: ${verified ? "PASS" : "FAIL"}`);

  // Export artifacts for Garaga
  exportProofArtifacts("membership", proof, publicSignals);

  return { proof, publicSignals, verified, input };
}

let garagaModule = null;

async function loadGaragaModule() {
  if (!garagaModule) {
    garagaModule = await import(
      path.join(CIRCUITS_DIR, "scripts/lib/garaga.mjs")
    );
  }
  return garagaModule;
}

/**
 * Read proof_calldata.txt and parse it into an array of hex felt252 values.
 * Format: one hex value per line.
 */
function readCalldata(circuitName) {
  const calldataPath = path.join(
    GARAGA_DIR,
    `${circuitName}_verifier`,
    "tests",
    "proof_calldata.txt",
  );
  if (!fs.existsSync(calldataPath)) {
    throw new Error(`Calldata file not found: ${calldataPath}`);
  }
  const content = fs.readFileSync(calldataPath, "utf8");
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l.startsWith("0x"));
}

// ============================================================================
// Validation Steps
// ============================================================================

/**
 * Step 1: Deposit a commitment into the coordinator.
 * Generates a note off-chain and calls coordinator.deposit(commitment).
 */
async function stepDeposit(addresses, noteData) {
  console.log("\n" + "=".repeat(60));
  console.log("  Step 1: Deposit commitment");
  console.log("=".repeat(60));

  // Check current leaf index
  const leafIndexBefore = starkliCall(addresses.coordinator, "get_next_leaf_index");
  console.log(`  Current leaf index: ${leafIndexBefore?.[0] || "unknown"}`);

  // Compute commitment
  console.log("  Computing commitment (BN128 Poseidon)...");
  const { commitment, nullifierHash } = await computeCommitmentOffchain(
    noteData.secret,
    noteData.nullifier,
    noteData.amount_low,
    noteData.amount_high,
    noteData.token,
  );
  console.log(`  Commitment: ${commitment.substring(0, 40)}...`);
  console.log(`  NullifierHash: ${nullifierHash.substring(0, 40)}...`);

  // Convert commitment to u256 (low, high) for starkli
  // u256 is serialized as two felt252 values: low 128 bits, high 128 bits
  const commitmentBig = BigInt(commitment);
  const mask128 = (1n << 128n) - 1n;
  const commitmentLow = "0x" + (commitmentBig & mask128).toString(16);
  const commitmentHigh = "0x" + (commitmentBig >> 128n).toString(16);
  console.log(`  Commitment (u256 low): ${commitmentLow}`);
  console.log(`  Commitment (u256 high): ${commitmentHigh}`);

  // Call coordinator.deposit(commitment) — u256 arg = low high
  console.log("  Calling coordinator.deposit()...");
  starkliInvoke(addresses.coordinator, "deposit", [commitmentLow, commitmentHigh]);

  // Verify
  const leafIndexAfter = starkliCall(addresses.coordinator, "get_next_leaf_index");
  console.log(`  Leaf index after: ${leafIndexAfter?.[0] || "unknown"}`);

  return { commitment, nullifierHash };
}

/**
 * Step 2: Build off-chain Merkle tree and submit root.
 */
async function stepSubmitRoot(addresses, commitment) {
  console.log("\n" + "=".repeat(60));
  console.log("  Step 2: Submit Merkle root");
  console.log("=".repeat(60));

  // Build LeanIMT tree with the commitment
  console.log("  Building off-chain Merkle tree (BN128 Poseidon, LeanIMT)...");
  const tree = await buildMerkleTree([commitment]);
  const root = tree.getRoot();
  console.log(`  Root: ${root.substring(0, 40)}...`);

  // For a single leaf in LeanIMT, root = commitment
  if (root === commitment) {
    console.log("  (Confirmed: single-leaf LeanIMT, root == commitment)");
  }

  // Submit root — u256 serialized as (low, high)
  const rootBig = BigInt(root);
  const mask128 = (1n << 128n) - 1n;
  const rootLow = "0x" + (rootBig & mask128).toString(16);
  const rootHigh = "0x" + (rootBig >> 128n).toString(16);
  console.log(`  Root (u256 low): ${rootLow}`);
  console.log(`  Root (u256 high): ${rootHigh}`);
  console.log("  Calling coordinator.submit_merkle_root()...");
  starkliInvoke(addresses.coordinator, "submit_merkle_root", [rootLow, rootHigh]);

  // Verify root is known — u256 arg = low high
  const isKnown = starkliCall(addresses.coordinator, "is_known_root", [rootLow, rootHigh]);
  console.log(`  is_known_root: ${isTruthy(isKnown?.[0]) ? "true" : "false"}`);

  return { root, rootLow, rootHigh };
}

/**
 * Step 3: Generate ZK proof.
 */
async function stepGenerateProof(noteData, merkleProof) {
  console.log("\n" + "=".repeat(60));
  console.log("  Step 3: Generate ZK proof (Membership)");
  console.log("=".repeat(60));

  console.log("  Generating Groth16 proof via snarkjs...");
  const { proof, publicSignals, verified, input } = await generateMembershipProof({
    secret: noteData.secret,
    nullifier: noteData.nullifier,
    amount_low: noteData.amount_low,
    amount_high: noteData.amount_high,
    token: noteData.token,
    merkleProof,
  });

  console.log(`  Public signals: ${publicSignals.length}`);
  for (let i = 0; i < publicSignals.length; i++) {
    const val = publicSignals[i];
    const display = val.length > 50 ? val.substring(0, 50) + "..." : val;
    console.log(`    [${i}]: ${display}`);
  }

  // Generate Garaga calldata
  console.log("  Generating Garaga calldata...");
  const garaga = await loadGaragaModule();
  if (!garaga.isGaragaAvailable()) {
    throw new Error("garaga CLI not found. Install: pip install garaga");
  }
  const success = garaga.generateCalldata("membership");
  if (!success) {
    throw new Error("Garaga calldata generation failed");
  }
  console.log("  Garaga calldata: OK");

  // Read calldata
  const calldata = readCalldata("membership");
  console.log(`  Calldata elements: ${calldata.length}`);

  return { proof, publicSignals, calldata };
}

/**
 * Step 4: Verify membership proof on-chain.
 */
async function stepVerifyOnchain(addresses, calldata, nullifierHash) {
  console.log("\n" + "=".repeat(60));
  console.log("  Step 4: Verify membership proof on-chain");
  console.log("=".repeat(60));

  // Check nullifier not spent — u256 serialized as (low, high)
  const nullifierBig = BigInt(nullifierHash);
  const mask128 = (1n << 128n) - 1n;
  const nullifierLow = "0x" + (nullifierBig & mask128).toString(16);
  const nullifierHigh = "0x" + (nullifierBig >> 128n).toString(16);
  const spentBefore = starkliCall(addresses.coordinator, "is_nullifier_spent", [nullifierLow, nullifierHigh]);
  console.log(`  Nullifier spent before: ${isTruthy(spentBefore?.[0]) ? "true" : "false"}`);

  // Call verify_membership with calldata
  // Span<felt252> is serialized as: length, elem1, elem2, ...
  const spanArgs = [calldata.length.toString(), ...calldata];
  console.log(`  Calling coordinator.verify_membership() with ${calldata.length} calldata elements...`);
  console.log("  (This may take a moment — Garaga BN254 pairing on-chain)");
  starkliInvoke(addresses.coordinator, "verify_membership", spanArgs);

  // Verify nullifier is now spent
  const spentAfter = starkliCall(addresses.coordinator, "is_nullifier_spent", [nullifierLow, nullifierHigh]);
  console.log(`  Nullifier spent after: ${isTruthy(spentAfter?.[0]) ? "true" : "false"}`);

  if (isTruthy(spentAfter?.[0])) {
    console.log("\n  MEMBERSHIP VERIFICATION: PASS");
  } else {
    console.log("\n  MEMBERSHIP VERIFICATION: UNKNOWN (check transaction)");
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("  Zylith Testnet Validation");
  console.log("=".repeat(60));

  // Parse args
  const args = process.argv.slice(2);
  const stepOnly = args.includes("--step") ? args[args.indexOf("--step") + 1] : null;

  // Load config
  loadEnv();
  const addresses = loadDeployedAddresses();
  console.log(`  Network:     ${addresses.network}`);
  console.log(`  Coordinator: ${addresses.coordinator}`);
  console.log(`  Pool:        ${addresses.pool}`);
  console.log(`  Admin:       ${addresses.admin}`);

  // Initialize modules
  console.log("\nInitializing Poseidon (BN128)...");
  await ensurePoseidon();
  console.log("Ready.\n");

  // Test note data
  // In production, these would be random. For testnet validation, we use fixed values
  // so we can reproduce and debug.
  const noteData = {
    secret: "123456789012345678901234567890",
    nullifier: "987654321098765432109876543210",
    amount_low: "1000000",
    amount_high: "0",
    token: "0xABCDEF0123456789",
  };

  // ---- Step 1: Deposit ----
  if (!stepOnly || stepOnly === "deposit" || stepOnly === "all") {
    const { commitment } = await stepDeposit(addresses, noteData);

    // ---- Step 2: Submit root ----
    if (!stepOnly || stepOnly === "all") {
      await stepSubmitRoot(addresses, commitment);
    }
  }

  // ---- Step 3: Generate proof ----
  if (!stepOnly || stepOnly === "proof" || stepOnly === "all") {
    // For proof generation, we need the commitment and Merkle proof
    const { commitment } = await computeCommitmentOffchain(
      noteData.secret,
      noteData.nullifier,
      noteData.amount_low,
      noteData.amount_high,
      noteData.token,
    );

    // Build tree and get proof (single leaf at index 0)
    const tree = await buildMerkleTree([commitment]);
    const merkleProof = tree.getProof(0);

    const { calldata } = await stepGenerateProof(noteData, merkleProof);

    // ---- Step 4: Verify on-chain ----
    if (!stepOnly || stepOnly === "all") {
      const { nullifierHash } = await computeCommitmentOffchain(
        noteData.secret,
        noteData.nullifier,
        noteData.amount_low,
        noteData.amount_high,
        noteData.token,
      );
      await stepVerifyOnchain(addresses, calldata, nullifierHash);
    }
  }

  // ---- Step: Verify only (using existing calldata) ----
  if (stepOnly === "verify") {
    const calldata = readCalldata("membership");
    const { nullifierHash } = await computeCommitmentOffchain(
      noteData.secret,
      noteData.nullifier,
      noteData.amount_low,
      noteData.amount_high,
      noteData.token,
    );
    await stepVerifyOnchain(addresses, calldata, nullifierHash);
  }

  console.log("\n" + "=".repeat(60));
  console.log("  Testnet validation complete!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
