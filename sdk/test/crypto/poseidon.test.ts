import { describe, it, expect, beforeAll } from "vitest";
import { initPoseidon, hash, isInitialized } from "../../src/crypto/poseidon.js";

describe("poseidon", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("initializes successfully", () => {
    expect(isInitialized()).toBe(true);
  });

  it("hashes a single input", () => {
    const result = hash(["1"]);
    expect(typeof result).toBe("string");
    expect(BigInt(result)).toBeGreaterThan(0n);
  });

  it("hashes two inputs", () => {
    const result = hash(["1", "2"]);
    expect(typeof result).toBe("string");
    expect(BigInt(result)).toBeGreaterThan(0n);
  });

  it("is deterministic", () => {
    const a = hash(["42", "43"]);
    const b = hash(["42", "43"]);
    expect(a).toBe(b);
  });

  it("different inputs produce different hashes", () => {
    const a = hash(["1", "2"]);
    const b = hash(["2", "1"]);
    expect(a).not.toBe(b);
  });

  it("accepts BigInt inputs", () => {
    const a = hash([1n, 2n]);
    const b = hash(["1", "2"]);
    expect(a).toBe(b);
  });

  it("accepts number inputs", () => {
    const a = hash([1, 2]);
    const b = hash(["1", "2"]);
    expect(a).toBe(b);
  });

  it("hash output fits in BN254 field", () => {
    const BN254_FIELD =
      21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const result = BigInt(hash(["12345", "67890"]));
    expect(result).toBeLessThan(BN254_FIELD);
    expect(result).toBeGreaterThanOrEqual(0n);
  });
});
