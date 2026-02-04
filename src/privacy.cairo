/// Zylith Privacy Layer
///
/// This module implements the privacy primitives for Zylith, a shielded AMM on Starknet.
/// It follows the Privacy Pools/Tornado Cash model adapted for Cairo.
///
/// ## Architecture
///
/// The privacy layer consists of four main components:
///
/// ### 1. Commitments (`commitment.cairo`)
/// - Generates Poseidon-based commitments: H(H(secret, nullifier), amount, token)
/// - Commitments hide deposit details while allowing verification
/// - Uses STARK-friendly Poseidon hash for efficiency
///
/// ### 2. Nullifiers (`nullifier.cairo`)
/// - Prevents double-spending by tracking used nullifier hashes
/// - Nullifier hash revealed on withdrawal, preventing reuse
/// - Maintains on-chain registry of spent nullifiers
///
/// ### 3. Merkle Tree (`merkle.cairo`)
/// - Incremental sparse Merkle tree (height 20, capacity 2^20)
/// - Stores commitments as leaves, maintains 100-root history
/// - Allows efficient membership proofs for withdrawals
///
/// ### 4. Notes (`notes.cairo`)
/// - Data structures for shielded notes and LP positions
/// - Notes stored off-chain by users, only commitments on-chain
/// - Shielded positions enable private liquidity provision
///
/// ## Usage Flow
///
/// ### Deposit
/// 1. User generates random secret and nullifier
/// 2. Compute commitment = H(H(secret, nullifier), amount, token)
/// 3. Insert commitment into Merkle tree, receive leaf_index
/// 4. Store note data off-chain
///
/// ### Withdrawal
/// 1. User provides Merkle proof for their commitment
/// 2. Reveal nullifier_hash to prevent double-spend
/// 3. Verify proof against known root
/// 4. Transfer funds to recipient address
///
/// ## Security Properties
///
/// - **Anonymity**: Commitments hide deposit details
/// - **Unlinkability**: Can't link deposits to withdrawals
/// - **Double-spend prevention**: Nullifiers ensure one-time use
/// - **Proof flexibility**: 100-root history allows batching
///
/// ## Gas Optimization
///
/// - Poseidon hash: STARK-native, efficient proving
/// - Incremental tree: O(log n) insertions
/// - Packed storage: Minimal storage footprint
/// - Precomputed zero values: No runtime computation

pub mod commitment;
pub mod merkle;
pub mod notes;
pub mod nullifier;

// Re-export commonly used items from commitment
pub use commitment::{
    are_commitment_components_valid, compute_commitment, compute_inner_hash, compute_nullifier_hash,
    is_valid_commitment,
};

// Re-export Merkle tree utilities
pub use merkle::{
    Errors as MerkleErrors, MAX_LEAVES, MerkleTreeTrait, ROOT_HISTORY_SIZE, TREE_HEIGHT,
    compute_empty_tree_root, get_zero_value, hash_left_right, verify_proof,
};

// Re-export note structures and utilities
pub use notes::{
    Deposit, FeesCollected, Note, PositionClosed, PositionOpened, ShieldedPosition, Withdrawal,
    create_note, create_shielded_position, is_valid_note, is_valid_position, note_to_commitment,
    note_to_nullifier_hash, update_position_fees, update_position_liquidity,
};

// Re-export nullifier utilities
pub use nullifier::{
    Errors as NullifierErrors, all_unspent, any_spent, is_nullifier_spent, is_valid_nullifier,
    verify_can_spend,
};
