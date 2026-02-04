/// Zylith Verifier Coordinator Interface
///
/// The coordinator is the central contract that:
/// 1. Routes proofs to appropriate circuit verifiers
/// 2. Manages the nullifier spent set (double-spend prevention)
/// 3. Updates the Merkle tree with new commitments
/// 4. Validates roots against known history
///
/// ## State Management
///
/// - **Nullifiers**: LegacyMap<felt252, bool> tracking spent nullifier hashes
/// - **Merkle Tree**: Incremental tree with 100-root history
/// - **Verifier Addresses**: Contract addresses for each circuit verifier
///
/// ## Security
///
/// - Only marks nullifiers as spent AFTER successful verification
/// - Rejects proofs with unknown/old roots
/// - Atomic state updates (all-or-nothing)

use starknet::ContractAddress;
use super::super::verifier::types::{
    Groth16Proof, MembershipPublicInputs, SwapPublicInputs, MintPublicInputs, BurnPublicInputs,
};

/// Coordinator interface for managing all proof verifications
#[starknet::interface]
pub trait IVerifierCoordinator<TContractState> {
    // ========================================================================
    // Verification Functions
    // ========================================================================

    /// Verify membership proof and register nullifier
    ///
    /// Use case: Proving note ownership for withdrawal
    ///
    /// # Arguments
    /// * `proof` - Groth16 proof from membership circuit
    /// * `public_inputs` - Membership circuit public inputs
    ///
    /// # Returns
    /// * `true` if verification succeeds
    ///
    /// # Side Effects
    /// * Marks nullifier_hash as spent
    /// * Emits MembershipVerified event
    ///
    /// # Panics
    /// * If root is not known
    /// * If nullifier is already spent
    /// * If proof verification fails
    fn verify_membership(
        ref self: TContractState, proof: Groth16Proof, public_inputs: MembershipPublicInputs,
    ) -> bool;

    /// Verify swap proof, register nullifier, add new commitments
    ///
    /// Use case: Private token swap
    ///
    /// # Arguments
    /// * `proof` - Groth16 proof from swap circuit
    /// * `public_inputs` - Swap circuit public inputs
    /// * `change_commitment` - Change note commitment (circuit output)
    ///
    /// # Returns
    /// * `true` if verification succeeds
    ///
    /// # Side Effects
    /// * Marks input nullifier_hash as spent
    /// * Inserts new_commitment to Merkle tree
    /// * Inserts change_commitment to Merkle tree
    /// * Emits SwapVerified and CommitmentAdded events
    fn verify_swap(
        ref self: TContractState,
        proof: Groth16Proof,
        public_inputs: SwapPublicInputs,
        change_commitment: felt252,
    ) -> bool;

    /// Verify mint proof, register nullifiers, add commitments
    ///
    /// Use case: Private liquidity provision
    ///
    /// # Arguments
    /// * `proof` - Groth16 proof from mint circuit
    /// * `public_inputs` - Mint circuit public inputs
    /// * `change_commitment0` - Token0 change commitment (circuit output)
    /// * `change_commitment1` - Token1 change commitment (circuit output)
    ///
    /// # Returns
    /// * `true` if verification succeeds
    ///
    /// # Side Effects
    /// * Marks nullifier_hash0 and nullifier_hash1 as spent
    /// * Inserts position_commitment to Merkle tree
    /// * Inserts change_commitment0 and change_commitment1 to Merkle tree
    /// * Emits MintVerified and CommitmentAdded events
    fn verify_mint(
        ref self: TContractState,
        proof: Groth16Proof,
        public_inputs: MintPublicInputs,
        change_commitment0: felt252,
        change_commitment1: felt252,
    ) -> bool;

    /// Verify burn proof, register nullifier, add output commitments
    ///
    /// Use case: Private liquidity removal
    ///
    /// # Arguments
    /// * `proof` - Groth16 proof from burn circuit
    /// * `public_inputs` - Burn circuit public inputs
    ///
    /// # Returns
    /// * `true` if verification succeeds
    ///
    /// # Side Effects
    /// * Marks position_nullifier_hash as spent
    /// * Inserts new_commitment0 and new_commitment1 to Merkle tree
    /// * Emits BurnVerified and CommitmentAdded events
    fn verify_burn(
        ref self: TContractState, proof: Groth16Proof, public_inputs: BurnPublicInputs,
    ) -> bool;

    // ========================================================================
    // State Query Functions
    // ========================================================================

    /// Check if a nullifier has been spent
    ///
    /// # Arguments
    /// * `nullifier_hash` - The nullifier hash to check
    ///
    /// # Returns
    /// * `true` if nullifier has been used in a previous proof
    fn is_nullifier_spent(self: @TContractState, nullifier_hash: felt252) -> bool;

    /// Get current Merkle tree root
    ///
    /// # Returns
    /// * The current (most recent) Merkle root
    fn get_merkle_root(self: @TContractState) -> felt252;

    /// Check if a root is known (in root history)
    ///
    /// # Arguments
    /// * `root` - The root to check
    ///
    /// # Returns
    /// * `true` if root is in the last 100 roots
    fn is_known_root(self: @TContractState, root: felt252) -> bool;

    /// Get the next leaf index for Merkle tree insertion
    ///
    /// # Returns
    /// * The index where the next commitment will be inserted
    fn get_next_leaf_index(self: @TContractState) -> u32;

    // ========================================================================
    // Admin Functions
    // ========================================================================

    /// Pause all verification operations (emergency only)
    ///
    /// # Panics
    /// * If caller is not admin
    fn pause(ref self: TContractState);

    /// Resume verification operations
    ///
    /// # Panics
    /// * If caller is not admin
    fn unpause(ref self: TContractState);

    /// Check if contract is paused
    fn is_paused(self: @TContractState) -> bool;

    /// Get admin address
    fn get_admin(self: @TContractState) -> ContractAddress;
}
