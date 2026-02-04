/// Zylith Verifier Interface
///
/// Defines the interface for Groth16 proof verification contracts.
/// Each circuit type (membership, swap, mint, burn) has its own verifier
/// that implements this interface.
///
/// ## Design Philosophy
///
/// - **Stateless verification**: Verifiers only check proof validity
/// - **Circuit-specific**: Each verifier knows its public input count
/// - **Garaga integration**: Uses Garaga's optimized pairing operations

use super::super::verifier::types::{Groth16Proof, VerificationResult};

/// Generic verifier interface for Groth16 proofs
///
/// All circuit-specific verifiers implement this trait.
/// The verification key is embedded as constants in each implementation.
#[starknet::interface]
pub trait IVerifier<TContractState> {
    /// Verify a Groth16 proof with public inputs
    ///
    /// # Arguments
    /// * `proof` - The Groth16 proof (A, B, C points)
    /// * `public_inputs` - Array of public input field elements
    ///
    /// # Returns
    /// * `VerificationResult::Valid` if proof is valid
    /// * `VerificationResult::Invalid(reason)` if proof fails
    ///
    /// # Panics
    /// * If public_inputs length doesn't match expected count
    fn verify_proof(
        self: @TContractState, proof: Groth16Proof, public_inputs: Span<felt252>,
    ) -> VerificationResult;

    /// Get the expected number of public inputs for this verifier
    ///
    /// # Returns
    /// * Number of felt252 elements expected in public_inputs array
    fn get_public_input_count(self: @TContractState) -> u32;

    /// Get circuit identifier for debugging/logging
    ///
    /// # Returns
    /// * Circuit name as ByteArray ("Membership", "Swap", "Mint", "Burn")
    fn get_circuit_name(self: @TContractState) -> ByteArray;
}
