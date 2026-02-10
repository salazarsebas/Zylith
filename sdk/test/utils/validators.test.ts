import { describe, it, expect } from "vitest";
import {
  validateTick,
  validateTickRange,
  validateTokenOrder,
  validateFieldElement,
  validateAmount,
} from "../../src/utils/validators.js";
import {
  MIN_TICK,
  MAX_TICK,
  BN254_SCALAR_FIELD,
} from "../../src/types/constants.js";

describe("validateTick", () => {
  it("accepts 0", () => {
    expect(() => validateTick(0)).not.toThrow();
  });

  it("accepts MIN_TICK", () => {
    expect(() => validateTick(MIN_TICK)).not.toThrow();
  });

  it("accepts MAX_TICK", () => {
    expect(() => validateTick(MAX_TICK)).not.toThrow();
  });

  it("rejects below MIN_TICK", () => {
    expect(() => validateTick(MIN_TICK - 1)).toThrow("Invalid tick");
  });

  it("rejects above MAX_TICK", () => {
    expect(() => validateTick(MAX_TICK + 1)).toThrow("Invalid tick");
  });

  it("rejects non-integer", () => {
    expect(() => validateTick(1.5)).toThrow("Must be an integer");
  });
});

describe("validateTickRange", () => {
  it("accepts valid range", () => {
    expect(() => validateTickRange(-100, 100)).not.toThrow();
  });

  it("rejects tickLower >= tickUpper", () => {
    expect(() => validateTickRange(100, 100)).toThrow("must be < tickUpper");
  });

  it("rejects reversed range", () => {
    expect(() => validateTickRange(100, -100)).toThrow("must be < tickUpper");
  });
});

describe("validateTokenOrder", () => {
  it("accepts ordered tokens", () => {
    expect(() => validateTokenOrder("1", "2")).not.toThrow();
  });

  it("rejects same tokens", () => {
    expect(() => validateTokenOrder("1", "1")).toThrow("must be different");
  });

  it("rejects reversed tokens", () => {
    expect(() => validateTokenOrder("2", "1")).toThrow("must be ordered");
  });
});

describe("validateFieldElement", () => {
  it("accepts 0", () => {
    expect(() => validateFieldElement(0n)).not.toThrow();
  });

  it("accepts value just under field", () => {
    expect(() =>
      validateFieldElement(BN254_SCALAR_FIELD - 1n),
    ).not.toThrow();
  });

  it("rejects field modulus", () => {
    expect(() => validateFieldElement(BN254_SCALAR_FIELD)).toThrow(
      "exceeds BN254",
    );
  });

  it("rejects negative", () => {
    expect(() => validateFieldElement(-1n)).toThrow("exceeds BN254");
  });
});

describe("validateAmount", () => {
  it("accepts 1", () => {
    expect(() => validateAmount(1n)).not.toThrow();
  });

  it("rejects 0", () => {
    expect(() => validateAmount(0n)).toThrow("must be positive");
  });

  it("rejects negative", () => {
    expect(() => validateAmount(-1n)).toThrow("must be positive");
  });

  it("rejects > u256 max", () => {
    expect(() => validateAmount(1n << 256n)).toThrow("exceeds u256");
  });

  it("accepts large valid amount", () => {
    expect(() => validateAmount((1n << 256n) - 1n)).not.toThrow();
  });
});
