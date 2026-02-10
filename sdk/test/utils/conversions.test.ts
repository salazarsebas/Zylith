import { describe, it, expect } from "vitest";
import {
  hexToDecimal,
  decimalToHex,
  u256Split,
  u256Combine,
  generateRandomSecret,
} from "../../src/utils/conversions.js";
import { BN254_SCALAR_FIELD } from "../../src/types/constants.js";

describe("hexToDecimal", () => {
  it("converts 0x0 to 0", () => {
    expect(hexToDecimal("0x0")).toBe("0");
  });

  it("converts 0xff to 255", () => {
    expect(hexToDecimal("0xff")).toBe("255");
  });

  it("converts large hex", () => {
    expect(hexToDecimal("0x100")).toBe("256");
  });

  it("handles no prefix", () => {
    expect(hexToDecimal("ff")).toBe("255");
  });

  it("handles uppercase", () => {
    expect(hexToDecimal("0xFF")).toBe("255");
  });
});

describe("decimalToHex", () => {
  it("converts 0 to 0x0", () => {
    expect(decimalToHex("0")).toBe("0x0");
  });

  it("converts 255 to 0xff", () => {
    expect(decimalToHex("255")).toBe("0xff");
  });

  it("round-trips with hexToDecimal", () => {
    const original = "0x123456789abcdef";
    const decimal = hexToDecimal(original);
    expect(decimalToHex(decimal)).toBe(original);
  });
});

describe("u256Split", () => {
  it("splits 0 into (0, 0)", () => {
    const { low, high } = u256Split(0n);
    expect(low).toBe(0n);
    expect(high).toBe(0n);
  });

  it("splits value that fits in 128 bits", () => {
    const { low, high } = u256Split(42n);
    expect(low).toBe(42n);
    expect(high).toBe(0n);
  });

  it("splits value that spans both halves", () => {
    const val = (1n << 128n) + 5n;
    const { low, high } = u256Split(val);
    expect(low).toBe(5n);
    expect(high).toBe(1n);
  });

  it("max u128 stays in low", () => {
    const maxU128 = (1n << 128n) - 1n;
    const { low, high } = u256Split(maxU128);
    expect(low).toBe(maxU128);
    expect(high).toBe(0n);
  });
});

describe("u256Combine", () => {
  it("combines (0, 0) to 0", () => {
    expect(u256Combine(0n, 0n)).toBe(0n);
  });

  it("combines (42, 0) to 42", () => {
    expect(u256Combine(42n, 0n)).toBe(42n);
  });

  it("round-trips with u256Split", () => {
    const original = (3n << 128n) + 7n;
    const { low, high } = u256Split(original);
    expect(u256Combine(low, high)).toBe(original);
  });

  it("round-trips large value", () => {
    const big = (1n << 255n) - 1n;
    const { low, high } = u256Split(big);
    expect(u256Combine(low, high)).toBe(big);
  });
});

describe("generateRandomSecret", () => {
  it("returns a decimal string", () => {
    const secret = generateRandomSecret();
    expect(typeof secret).toBe("string");
    expect(() => BigInt(secret)).not.toThrow();
  });

  it("fits within BN254 scalar field", () => {
    for (let i = 0; i < 10; i++) {
      const val = BigInt(generateRandomSecret());
      expect(val).toBeGreaterThanOrEqual(0n);
      expect(val).toBeLessThan(BN254_SCALAR_FIELD);
    }
  });

  it("generates unique values", () => {
    const a = generateRandomSecret();
    const b = generateRandomSecret();
    expect(a).not.toBe(b);
  });
});
