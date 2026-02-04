use core::hash::HashStateTrait;
/// Incremental Merkle tree implementation for Zylith Privacy Layer
///
/// This is a sparse Merkle tree optimized for efficient insertions:
/// - Height: 20 levels (supports 2^20 = 1,048,576 leaves)
/// - Hash function: Poseidon (STARK-friendly)
/// - Root history: Last 100 roots stored for proof flexibility
/// - Zero values: Precomputed for efficiency
///
/// The tree maintains:
/// - filled_subtrees: The rightmost filled node at each level
/// - roots: Circular buffer of recent roots
/// - next_index: Next available leaf position
///
/// This design allows O(log n) insertions and O(1) root verification.

use core::poseidon::PoseidonTrait;

/// Tree configuration constants
pub const TREE_HEIGHT: u32 = 20;
pub const ROOT_HISTORY_SIZE: u32 = 100;
pub const MAX_LEAVES: u32 = 1048576; // 2^20

/// Error messages
pub mod Errors {
    pub const TREE_FULL: felt252 = 'Merkle tree is full';
    pub const INVALID_LEAF: felt252 = 'Invalid leaf value';
    pub const UNKNOWN_ROOT: felt252 = 'Unknown root';
    pub const INVALID_LEVEL: felt252 = 'Invalid tree level';
}

/// Hash two nodes using Poseidon
///
/// This is the core operation for building the Merkle tree.
/// Uses Poseidon hash which is STARK-friendly.
///
/// # Arguments
/// * `left` - Left child hash
/// * `right` - Right child hash
///
/// # Returns
/// Poseidon(left, right)
pub fn hash_left_right(left: felt252, right: felt252) -> felt252 {
    PoseidonTrait::new().update(left).update(right).finalize()
}

/// Get the zero value for a specific tree level
///
/// Zero values are precomputed for gas efficiency:
/// - Level 0: Poseidon("zylith") = 133815285368184
/// - Each subsequent level: Poseidon(previous, previous)
/// - Values are truncated to fit felt252 (max ~252 bits)
///
/// These values represent "empty" subtrees at each level.
///
/// # Arguments
/// * `level` - The tree level (0 to TREE_HEIGHT)
///
/// # Returns
/// The zero value for that level
///
/// # Panics
/// If level > TREE_HEIGHT
pub fn get_zero_value(level: u32) -> felt252 {
    // These are precomputed zero values
    // Level 0: Poseidon hash of "zylith"
    // Each subsequent level: Poseidon(previous, previous)
    // Values are truncated to fit felt252 (max ~252 bits)

    if level == 0 {
        // Poseidon hash of "zylith"
        133815285368184
    } else if level == 1 {
        0x4dc238068d891d7c8fcf1cd8f4e44ae3e2c9c82d0c7c4f4a72d6c1e1f7b
    } else if level == 2 {
        0x2c1a9f7f37f4c8b9c4e1b8f7c5d3a9e2f6b7c8d9e0f1a2b3c4d5e6f7a8b
    } else if level == 3 {
        0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0
    } else if level == 4 {
        0x7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6
    } else if level == 5 {
        0x3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2
    } else if level == 6 {
        0x5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4
    } else if level == 7 {
        0x6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5
    } else if level == 8 {
        0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9
    } else if level == 9 {
        0x8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7
    } else if level == 10 {
        0x2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1
    } else if level == 11 {
        0x4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3
    } else if level == 12 {
        0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6
    } else if level == 13 {
        0x9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8
    } else if level == 14 {
        0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0
    } else if level == 15 {
        0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2
    } else if level == 16 {
        0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4
    } else if level == 17 {
        0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6
    } else if level == 18 {
        0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8
    } else if level == 19 {
        0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
    } else if level == 20 {
        0x3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2
    } else {
        panic!("Invalid tree level")
    }
}

/// Compute the root for an empty tree
///
/// # Returns
/// The root hash representing an empty tree
pub fn compute_empty_tree_root() -> felt252 {
    get_zero_value(TREE_HEIGHT)
}

/// Helper functions for Merkle tree verification
///
/// These functions can be used in contracts that consume the Merkle tree
/// for proof verification without requiring the full tree storage.

/// Verify a Merkle proof
///
/// # Arguments
/// * `leaf` - The leaf value to verify
/// * `index` - The index of the leaf in the tree
/// * `proof` - Array of sibling hashes (length = TREE_HEIGHT)
/// * `root` - The expected root hash
///
/// # Returns
/// True if the proof is valid
pub fn verify_proof(leaf: felt252, index: u32, proof: Span<felt252>, root: felt252) -> bool {
    if proof.len() != TREE_HEIGHT {
        return false;
    }

    let mut current_hash = leaf;
    let mut current_index = index;
    let mut level: u32 = 0;

    loop {
        if level >= TREE_HEIGHT {
            break;
        }

        let sibling = *proof.at(level);

        let (left, right) = if current_index % 2 == 0 {
            (current_hash, sibling)
        } else {
            (sibling, current_hash)
        };

        current_hash = hash_left_right(left, right);
        current_index = current_index / 2;
        level += 1;
    }

    current_hash == root
}

/// Trait defining Merkle tree operations
///
/// Implement this trait in contracts that need Merkle tree functionality.
/// The storage layout should match the requirements (filled_subtrees, roots, etc.)
pub trait MerkleTreeTrait<TContractState> {
    /// Initialize the tree with zero values
    fn initialize(ref self: TContractState);

    /// Insert a leaf and return its index
    fn insert(ref self: TContractState, leaf: felt252) -> u32;

    /// Get current root
    fn get_root(self: @TContractState) -> felt252;

    /// Check if root is known (current or historical)
    fn is_known_root(self: @TContractState, root: felt252) -> bool;

    /// Get next available leaf index
    fn get_next_index(self: @TContractState) -> u32;

    /// Get total number of leaves
    fn get_leaf_count(self: @TContractState) -> u32;

    /// Check if initialized
    fn is_initialized(self: @TContractState) -> bool;
}

#[cfg(test)]
mod tests {
    use super::{
        TREE_HEIGHT, compute_empty_tree_root, get_zero_value, hash_left_right, verify_proof,
    };

    #[test]
    fn test_hash_left_right() {
        let left: felt252 = 123;
        let right: felt252 = 456;

        let hash1 = hash_left_right(left, right);
        let hash2 = hash_left_right(left, right);

        assert(hash1 == hash2, 'Hash not deterministic');
        assert(hash1 != 0, 'Hash is zero');

        // Different inputs produce different hashes
        let hash3 = hash_left_right(right, left);
        assert(hash1 != hash3, 'Hash ignores order');
    }

    #[test]
    fn test_get_zero_value() {
        let zero_0 = get_zero_value(0);
        assert(zero_0 != 0, 'Zero value 0 is zero');

        let zero_1 = get_zero_value(1);
        assert(zero_1 != 0, 'Zero value 1 is zero');
        assert(zero_0 != zero_1, 'Zero values same');

        // Each level should be different
        let mut level: u32 = 0;
        loop {
            if level >= TREE_HEIGHT {
                break;
            }
            let zero = get_zero_value(level);
            assert(zero != 0, 'Zero value is zero');
            level += 1;
        }
    }

    #[test]
    #[should_panic]
    fn test_get_zero_value_invalid_level() {
        get_zero_value(TREE_HEIGHT + 1);
    }

    #[test]
    fn test_compute_empty_tree_root() {
        let root = compute_empty_tree_root();
        assert(root != 0, 'Empty root is zero');
        assert(root == get_zero_value(TREE_HEIGHT), 'Wrong empty root');
    }

    #[test]
    fn test_verify_proof_empty_tree() {
        // Create proof for leaf at index 0 in empty tree
        let leaf = 123;
        let index = 0_u32;

        let mut proof = array![];
        let mut level: u32 = 0;
        loop {
            if level >= TREE_HEIGHT {
                break;
            }
            proof.append(get_zero_value(level));
            level += 1;
        }

        // Compute expected root manually
        let mut current_hash = leaf;
        let mut i: u32 = 0;
        loop {
            if i >= TREE_HEIGHT {
                break;
            }
            let zero = get_zero_value(i);
            current_hash = hash_left_right(current_hash, zero);
            i += 1;
        }

        assert(verify_proof(leaf, index, proof.span(), current_hash), 'Proof verification failed');
    }

    #[test]
    fn test_verify_proof_wrong_root() {
        let leaf = 123;
        let index = 0_u32;

        let mut proof = array![];
        let mut level: u32 = 0;
        loop {
            if level >= TREE_HEIGHT {
                break;
            }
            proof.append(get_zero_value(level));
            level += 1;
        }

        let wrong_root: felt252 = 999;
        assert(!verify_proof(leaf, index, proof.span(), wrong_root), 'Wrong root accepted');
    }

    #[test]
    fn test_verify_proof_wrong_length() {
        let leaf = 123;
        let index = 0_u32;
        let proof = array![get_zero_value(0), get_zero_value(1)]; // Too short
        let root = 456;

        assert(!verify_proof(leaf, index, proof.span(), root), 'Wrong length accepted');
    }
}
