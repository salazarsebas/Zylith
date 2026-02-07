pub mod coordinator;
/// Zylith Verifier Module
///
/// Implements Groth16 proof verification for Zylith's privacy layer.
/// Uses Garaga-generated verifier contracts for on-chain verification
/// of ZK proofs from Circom circuits on BN254.
///
/// ## Architecture
///
/// ```
///                    VerifierCoordinator
///                           |
///     +----------+----------+----------+----------+
///     |          |          |          |
/// Membership   Swap       Mint       Burn
/// (Garaga)    (Garaga)   (Garaga)   (Garaga)
/// ```
///
/// The coordinator routes `full_proof_with_hints` blobs to the appropriate
/// Garaga verifier contract. Each verifier is a separate contract generated
/// by `garaga gen` and deployed independently.
///
/// ### Coordinator (`coordinator.cairo`)
/// - Central contract managing all proof verifications
/// - Routes proofs to Garaga verifier contracts via `IGroth16VerifierBN254`
/// - Manages nullifier spent set (double-spend prevention)
/// - Updates Merkle tree with new commitments
/// - Validates roots against known history
///
/// ### Garaga Verifiers (`garaga_verifiers/`)
/// - **membership_verifier**: Proves note ownership
/// - **swap_verifier**: Proves valid private swap
/// - **mint_verifier**: Proves valid liquidity provision
/// - **burn_verifier**: Proves valid liquidity removal
///
/// Each verifier embeds its circuit-specific verification key and uses
/// Garaga's optimized MSM and multi-pairing operations.
///
/// ## Types (`types.cairo`)
///
/// ### Public Inputs
/// - `MembershipPublicInputs`: root, nullifier_hash
/// - `SwapPublicInputs`: change_commitment, root, nullifier_hash, new_commitment, tokens, amounts
/// - `MintPublicInputs`: change_commitments, root, nullifiers, position_commitment, ticks
/// - `BurnPublicInputs`: root, position_nullifier, output_commitments, ticks
///
/// ## Verification Flow
///
/// 1. **User generates proof off-chain** using snarkjs
/// 2. **User generates calldata** using `garaga calldata`
/// 3. **User submits `full_proof_with_hints`** to Coordinator
/// 4. **Coordinator calls Garaga Verifier** which performs Groth16 verification
/// 5. **Coordinator extracts public inputs** from verified proof result
/// 6. **Coordinator validates state** (known root, unspent nullifiers)
/// 7. **Coordinator updates state** (nullifiers, Merkle tree, events)

pub mod types;

// Re-export coordinator
pub use coordinator::VerifierCoordinator;

// Re-export types
pub use types::{
    BurnPublicInputs, Errors, MAX_TICK_OFFSET, MembershipPublicInputs, MintPublicInputs,
    PublicInputCounts, SwapPublicInputs, TICK_OFFSET, extract_burn_inputs,
    extract_membership_inputs, extract_mint_inputs, extract_swap_inputs,
};
