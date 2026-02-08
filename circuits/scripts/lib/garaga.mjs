/**
 * Garaga CLI wrapper for calldata generation.
 *
 * Generates proof_calldata.txt files that the Garaga verifier snforge tests consume.
 * Command: garaga calldata --system groth16 --vk <vk> --proof <proof>
 *          --public-inputs <public> --format snforge --output-path <dir>
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(__dirname, "../../build");
const GARAGA_DIR = path.resolve(__dirname, "../../../garaga_verifiers");

/** Check if garaga CLI is available. */
export function isGaragaAvailable() {
  try {
    execSync("garaga --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate Garaga calldata for a circuit.
 * Writes proof_calldata.txt to the verifier's tests directory.
 *
 * @param {string} circuitName - Circuit name
 * @returns {boolean} true if successful
 */
export function generateCalldata(circuitName) {
  const vkPath = path.join(BUILD_DIR, circuitName, "verification_key.json");
  const proofPath = path.join(BUILD_DIR, circuitName, "proof.json");
  const publicPath = path.join(BUILD_DIR, circuitName, "public.json");
  const outputPath = path.join(GARAGA_DIR, `${circuitName}_verifier`, "tests");

  // Verify inputs exist
  for (const [label, p] of [
    ["vk", vkPath],
    ["proof", proofPath],
    ["public", publicPath],
  ]) {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing ${label} file for garaga: ${p}`);
    }
  }

  fs.mkdirSync(outputPath, { recursive: true });

  const cmd = [
    "garaga calldata",
    "--system groth16",
    `--vk "${vkPath}"`,
    `--proof "${proofPath}"`,
    `--public-inputs "${publicPath}"`,
    "--format snforge",
    `--output-path "${outputPath}"`,
  ].join(" ");

  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err) {
    console.error(`  garaga calldata failed: ${err.stderr?.toString() || err.message}`);
    return false;
  }

  const calldataPath = path.join(outputPath, "proof_calldata.txt");
  return fs.existsSync(calldataPath);
}
