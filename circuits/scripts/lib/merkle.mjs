/**
 * LeanIMT Merkle tree matching circuits/common/merkle.circom.
 *
 * Key behavior from the circuit:
 * - If sibling == 0 (field zero), node propagates unchanged (no hash)
 * - If sibling != 0, hash(left, right) based on pathIndex
 *
 * This means:
 * - Single leaf at index 0: all siblings = 0, root = leaf itself
 * - Two leaves: root = Poseidon(leaf0, leaf1), etc.
 *
 * All values stored and returned as decimal strings for compatibility.
 */
import { hash, toStr } from "./poseidon.mjs";

const TREE_HEIGHT = 20;
const ZERO = "0";

export class MerkleTree {
  constructor() {
    this.height = TREE_HEIGHT;
    this.leaves = []; // stored as decimal strings
  }

  /** Insert a leaf (as decimal string). */
  insert(leaf) {
    if (this.leaves.length >= 2 ** this.height) {
      throw new Error("Tree is full");
    }
    this.leaves.push(String(leaf));
  }

  /** Compute the root of the tree. Returns decimal string. */
  getRoot() {
    if (this.leaves.length === 0) return ZERO;
    return this._computeNode(0, this.height);
  }

  /** Get a Merkle proof for the leaf at the given index. */
  getProof(leafIndex) {
    if (leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of range`);
    }

    const pathElements = [];
    const pathIndices = [];

    for (let level = 0; level < this.height; level++) {
      const isRight = (leafIndex >> level) & 1;
      pathIndices.push(isRight);

      // Sibling is the node at the other side of the branch
      const siblingNodeIndex = (leafIndex >> level) ^ 1;
      const sibling = this._computeNode(siblingNodeIndex, level);
      pathElements.push(sibling);
    }

    return {
      pathElements,
      pathIndices,
      root: this.getRoot(),
    };
  }

  /**
   * Compute the node value for a subtree. Returns decimal string.
   * nodeIndex: the index of the node at the given level
   * level: current level (0 = leaf level)
   */
  _computeNode(nodeIndex, level) {
    if (level === 0) {
      // Leaf level
      if (nodeIndex < this.leaves.length) {
        return this.leaves[nodeIndex];
      }
      return ZERO;
    }

    const leftChild = this._computeNode(nodeIndex * 2, level - 1);
    const rightChild = this._computeNode(nodeIndex * 2 + 1, level - 1);

    // LeanIMT: if right child is 0, propagate left unchanged
    if (rightChild === ZERO) {
      return leftChild;
    }
    // If left child is 0, propagate right unchanged
    if (leftChild === ZERO) {
      return rightChild;
    }

    // Hash the two children
    return toStr(hash([leftChild, rightChild]));
  }
}

/**
 * Get a simple proof for a single leaf at index 0 in an empty tree.
 * All siblings are 0, root = leaf.
 */
export function getSingleLeafProof(leafValue) {
  return {
    pathElements: Array(TREE_HEIGHT).fill("0"),
    pathIndices: Array(TREE_HEIGHT).fill(0),
    root: String(leafValue), // LeanIMT: all-zero siblings means root = leaf
  };
}
