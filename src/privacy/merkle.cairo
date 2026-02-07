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
    // Precomputed Poseidon zero value chain:
    // Level 0: Poseidon('zylith_empty')
    // Level N: Poseidon(zero[N-1], zero[N-1])
    // Verified by test_zero_value_chain_consistency

    if level == 0 {
        297878392397561531323157514055338665326964516349375370620567031486115348283
    } else if level == 1 {
        3512288313568464473430123398549864813878190791833821439566875248098264113824
    } else if level == 2 {
        2226399828310042547025502182856342619856289368590277596021551607660163312009
    } else if level == 3 {
        905599745540687661875639291910401977748354141354090986604933229459406018662
    } else if level == 4 {
        1331494656479495675629843380459434910975829908496242564122007472935530882837
    } else if level == 5 {
        383408553629153325756714596935282276184744537328238656380875636978495766639
    } else if level == 6 {
        287639463975670844702838146857925829605394072868779367267864950867646007386
    } else if level == 7 {
        2134938431843311713859962912258022701497364828844005554097336824763920873155
    } else if level == 8 {
        3162174301111649376329924521798765580556642550281878124006540024234020491379
    } else if level == 9 {
        1306841445268475488516997097079695960671052671032173836107686781971969828159
    } else if level == 10 {
        158419431156437591443576247694098626122649154998042606964711629791023537634
    } else if level == 11 {
        2314647922971296399760648388134600268487322555755038345629197314736135585819
    } else if level == 12 {
        1474873748132138574208020738955470347011879797547241174684183554103504497314
    } else if level == 13 {
        2947696221425311512246196719220699861457441483100273685163813928063266642416
    } else if level == 14 {
        1707469952005801523734039187478545083284251578212905469004558254335564098936
    } else if level == 15 {
        1990100374430916830350861753414614861876321351213918748074475145548486435584
    } else if level == 16 {
        1142754151820279709283449124025596639156811981256255654396652155250162632188
    } else if level == 17 {
        3257962958519477661242782713031299639568338926522404463209707000270729863315
    } else if level == 18 {
        3004463342133493790990820424363815158480513356647162176019668083288463038282
    } else if level == 19 {
        222519360520853879052479655010468092669588245194428047127117822218137278682
    } else if level == 20 {
        3351928550297575556699653391767024314629277312693253881898903895603075591419
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
    use core::hash::HashStateTrait;
    use core::poseidon::PoseidonTrait;
    use super::{
        TREE_HEIGHT, compute_empty_tree_root, get_zero_value, hash_left_right, verify_proof,
    };

    #[test]
    fn test_zero_value_chain_consistency() {
        // Verify the precomputed zero values match the Poseidon hash chain
        // Level 0: Poseidon('zylith_empty')
        // Level N: hash_left_right(zero[N-1], zero[N-1])
        let seed: felt252 = 'zylith_empty';
        let level_0 = PoseidonTrait::new().update(seed).finalize();
        assert(get_zero_value(0) == level_0, 'Level 0 mismatch');

        let mut prev = level_0;
        let mut level: u32 = 1;
        loop {
            if level > TREE_HEIGHT {
                break;
            }
            let expected = hash_left_right(prev, prev);
            assert(get_zero_value(level) == expected, 'Zero chain mismatch');
            prev = expected;
            level += 1;
        };
    }

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
