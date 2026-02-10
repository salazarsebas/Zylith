import { describe, it, expect, beforeAll } from "vitest";
import { initPoseidon, hash } from "../../src/crypto/poseidon.js";
import { MerkleTree, getSingleLeafProof } from "../../src/crypto/merkle.js";
import { TREE_HEIGHT } from "../../src/types/constants.js";

describe("MerkleTree", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("empty tree has root 0", () => {
    const tree = new MerkleTree(4);
    expect(tree.getRoot()).toBe("0");
  });

  it("single leaf: root = leaf (LeanIMT)", () => {
    const tree = new MerkleTree(4);
    tree.insert("12345");
    expect(tree.getRoot()).toBe("12345");
  });

  it("two leaves: root = hash(leaf0, leaf1)", () => {
    const tree = new MerkleTree(4);
    tree.insert("111");
    tree.insert("222");
    const expected = hash(["111", "222"]);
    expect(tree.getRoot()).toBe(expected);
  });

  it("three leaves: correct tree structure", () => {
    const tree = new MerkleTree(4);
    tree.insert("100");
    tree.insert("200");
    tree.insert("300");
    // Left subtree: hash(100, 200); Right subtree: 300 (LeanIMT: right child=0 → propagate)
    const leftSubtree = hash(["100", "200"]);
    const expected = hash([leftSubtree, "300"]);
    expect(tree.getRoot()).toBe(expected);
  });

  it("tracks leaf count", () => {
    const tree = new MerkleTree(4);
    expect(tree.leafCount).toBe(0);
    tree.insert("1");
    expect(tree.leafCount).toBe(1);
    tree.insert("2");
    expect(tree.leafCount).toBe(2);
  });

  it("throws when tree is full", () => {
    const tree = new MerkleTree(2); // max 4 leaves
    tree.insert("1");
    tree.insert("2");
    tree.insert("3");
    tree.insert("4");
    expect(() => tree.insert("5")).toThrow("Tree is full");
  });

  describe("getProof", () => {
    it("proof for single leaf: all zeros", () => {
      const tree = new MerkleTree(4);
      tree.insert("12345");
      const proof = tree.getProof(0);
      expect(proof.pathElements).toHaveLength(4);
      expect(proof.pathIndices).toHaveLength(4);
      expect(proof.pathElements.every((e) => e === "0")).toBe(true);
      expect(proof.pathIndices.every((i) => i === 0)).toBe(true);
      expect(proof.root).toBe("12345");
    });

    it("proof for two leaves", () => {
      const tree = new MerkleTree(4);
      tree.insert("111");
      tree.insert("222");
      const proof0 = tree.getProof(0);
      expect(proof0.pathElements[0]).toBe("222"); // sibling at level 0
      expect(proof0.pathIndices[0]).toBe(0); // leaf 0 is on the left
      expect(proof0.root).toBe(hash(["111", "222"]));

      const proof1 = tree.getProof(1);
      expect(proof1.pathElements[0]).toBe("111"); // sibling at level 0
      expect(proof1.pathIndices[0]).toBe(1); // leaf 1 is on the right
    });

    it("throws for out-of-range index", () => {
      const tree = new MerkleTree(4);
      tree.insert("1");
      expect(() => tree.getProof(1)).toThrow("out of range");
      expect(() => tree.getProof(-1)).toThrow("out of range");
    });
  });

  describe("persistence", () => {
    it("exportState and fromState round-trip", () => {
      const tree = new MerkleTree(4);
      tree.insert("100");
      tree.insert("200");
      tree.insert("300");

      const state = tree.exportState();
      const restored = MerkleTree.fromState(state);
      expect(restored.getRoot()).toBe(tree.getRoot());
      expect(restored.leafCount).toBe(3);
    });
  });
});

describe("getSingleLeafProof", () => {
  it("returns proof with all-zero siblings", () => {
    const proof = getSingleLeafProof("12345");
    expect(proof.pathElements).toHaveLength(TREE_HEIGHT);
    expect(proof.pathIndices).toHaveLength(TREE_HEIGHT);
    expect(proof.pathElements.every((e) => e === "0")).toBe(true);
    expect(proof.pathIndices.every((i) => i === 0)).toBe(true);
    expect(proof.root).toBe("12345");
  });

  it("accepts BigInt", () => {
    const proof = getSingleLeafProof(99n);
    expect(proof.root).toBe("99");
  });
});
