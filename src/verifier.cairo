/// Zylith Verifier Module
///
/// This module implements Groth16 proof verification for Zylith's privacy layer
/// using Garaga on Starknet. It enables on-chain verification of ZK proofs
/// generated from Circom circuits.
///
/// ## Architecture
///
/// The verifier module follows a coordinator pattern:
///
/// ```
///                    VerifierCoordinator
///                           |
///     +----------+----------+----------+----------+
///     |          |          |          |
/// Membership   Swap       Mint       Burn
/// Verifier   Verifier   Verifier   Verifier
/// ```
///
/// ### Coordinator (`coordinator.cairo`)
/// - Central contract managing all proof verifications
/// - Routes proofs to appropriate circuit verifiers
/// - Manages nullifier spent set (double-spend prevention)
/// - Updates Merkle tree with new commitments
/// - Validates roots against known history
///
/// ### Individual Verifiers
/// - **MembershipVerifier**: Proves note ownership without revealing details
/// - **SwapVerifier**: Proves valid private swap operations
/// - **MintVerifier**: Proves valid private liquidity provision
/// - **BurnVerifier**: Proves valid private liquidity removal
///
/// Each verifier embeds its verification key as constants and uses
/// Garaga's optimized pairing operations for Groth16 verification.
///
/// ## Types (`types.cairo`)
///
/// ### Curve Points
/// - `G1Point`: BN254 G1 point (2 coordinates)
/// - `G2Point`: BN254 G2 point (4 coordinates, extension field)
/// - `Groth16Proof`: Complete proof structure (A, B, C points)
///
/// ### Public Inputs
/// - `MembershipPublicInputs`: root, nullifier_hash
/// - `SwapPublicInputs`: root, nullifier_hash, new_commitment, tokens, amounts
/// - `MintPublicInputs`: root, nullifiers, position_commitment, ticks
/// - `BurnPublicInputs`: root, position_nullifier, output_commitments, ticks
///
/// ## Verification Flow
///
/// 1. **User generates proof off-chain** using snarkjs
/// 2. **User submits proof to Coordinator**
/// 3. **Coordinator validates preconditions**:
///    - Root is known (in history)
///    - Nullifiers not spent
/// 4. **Coordinator calls appropriate Verifier**
/// 5. **Verifier performs Groth16 pairing check**
/// 6. **On success, Coordinator updates state**:
///    - Marks nullifiers as spent
///    - Inserts new commitments to Merkle tree
///    - Emits events
///
/// ## Integration with Garaga
///
/// After running the trusted setup and Garaga verifier generation:
///
/// 1. Run `circuits/scripts/setup.sh` to generate verification keys
/// 2. Run `circuits/scripts/generate_verifiers.sh` to create Garaga code
/// 3. Copy verification key constants to each verifier contract
/// 4. Replace TODO implementations with Garaga MSM/pairing calls
///
/// ## Security Considerations
///
/// - Verification keys are embedded as immutable constants
/// - Nullifiers are marked spent ONLY after successful verification
/// - Root history (100 roots) allows proof batching
/// - All state updates are atomic

pub mod types;
pub mod membership_verifier;
pub mod swap_verifier;
pub mod mint_verifier;
pub mod burn_verifier;
pub mod coordinator;

// Re-export types for external use
pub use types::{
    // Curve types
    G1Point,
    G2Point,
    Groth16Proof,
    VerificationResult,
    is_valid,
    // Public input types
    MembershipPublicInputs,
    SwapPublicInputs,
    MintPublicInputs,
    BurnPublicInputs,
    // Conversion utilities
    membership_inputs_to_array,
    swap_inputs_to_array,
    mint_inputs_to_array,
    burn_inputs_to_array,
    // Constants
    PublicInputCounts,
    TICK_OFFSET,
    MAX_TICK_OFFSET,
    Errors,
};

// Re-export verifier contracts
pub use membership_verifier::MembershipVerifier;
pub use swap_verifier::SwapVerifier;
pub use mint_verifier::MintVerifier;
pub use burn_verifier::BurnVerifier;
pub use coordinator::VerifierCoordinator;
