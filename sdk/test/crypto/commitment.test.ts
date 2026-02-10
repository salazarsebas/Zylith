import { describe, it, expect, beforeAll } from "vitest";
import { initPoseidon, hash } from "../../src/crypto/poseidon.js";
import {
  computeCommitment,
  computePositionCommitment,
} from "../../src/crypto/commitment.js";

describe("commitment", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  describe("computeCommitment", () => {
    it("returns commitment, nullifierHash, and innerHash", () => {
      const result = computeCommitment("100", "200", "1000", "0", "999");
      expect(result).toHaveProperty("commitment");
      expect(result).toHaveProperty("nullifierHash");
      expect(result).toHaveProperty("innerHash");
    });

    it("commitment matches manual computation", () => {
      const secret = "111";
      const nullifier = "222";
      const amountLow = "500";
      const amountHigh = "0";
      const token = "777";

      const expectedInnerHash = hash([secret, nullifier]);
      const expectedNullifierHash = hash([nullifier]);
      const expectedCommitment = hash([
        expectedInnerHash,
        amountLow,
        amountHigh,
        token,
      ]);

      const result = computeCommitment(
        secret,
        nullifier,
        amountLow,
        amountHigh,
        token,
      );
      expect(result.innerHash).toBe(expectedInnerHash);
      expect(result.nullifierHash).toBe(expectedNullifierHash);
      expect(result.commitment).toBe(expectedCommitment);
    });

    it("is deterministic", () => {
      const a = computeCommitment("1", "2", "3", "0", "4");
      const b = computeCommitment("1", "2", "3", "0", "4");
      expect(a.commitment).toBe(b.commitment);
      expect(a.nullifierHash).toBe(b.nullifierHash);
    });

    it("different secrets produce different commitments", () => {
      const a = computeCommitment("1", "2", "3", "0", "4");
      const b = computeCommitment("99", "2", "3", "0", "4");
      expect(a.commitment).not.toBe(b.commitment);
    });

    it("different nullifiers produce different nullifierHash", () => {
      const a = computeCommitment("1", "2", "3", "0", "4");
      const b = computeCommitment("1", "99", "3", "0", "4");
      expect(a.nullifierHash).not.toBe(b.nullifierHash);
    });

    it("accepts BigInt inputs", () => {
      const a = computeCommitment("1", "2", "3", "0", "4");
      const b = computeCommitment(1n, 2n, 3n, 0n, 4n);
      expect(a.commitment).toBe(b.commitment);
    });
  });

  describe("computePositionCommitment", () => {
    it("returns commitment and nullifierHash", () => {
      const result = computePositionCommitment("100", "200", -100, 100, "5000");
      expect(result).toHaveProperty("commitment");
      expect(result).toHaveProperty("nullifierHash");
    });

    it("commitment matches manual computation", () => {
      const secret = "111";
      const nullifier = "222";
      const tickLower = -60;
      const tickUpper = 60;
      const liquidity = "10000";

      const expectedNullifierHash = hash([nullifier]);
      const expectedCommitment = hash([
        secret,
        nullifier,
        tickLower,
        tickUpper,
        liquidity,
      ]);

      const result = computePositionCommitment(
        secret,
        nullifier,
        tickLower,
        tickUpper,
        liquidity,
      );
      expect(result.nullifierHash).toBe(expectedNullifierHash);
      expect(result.commitment).toBe(expectedCommitment);
    });

    it("different ticks produce different commitments", () => {
      const a = computePositionCommitment("1", "2", -100, 100, "5000");
      const b = computePositionCommitment("1", "2", -200, 200, "5000");
      expect(a.commitment).not.toBe(b.commitment);
    });
  });
});
