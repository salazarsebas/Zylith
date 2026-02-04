/// Zylith Verifier Types
///
/// This module defines the data structures used for Groth16 proof verification
/// with Garaga on Starknet. All types are designed to be compatible with
/// BN254 curve operations used by Circom/snarkjs.
///
/// ## Type Hierarchy
///
/// - `G1Point`: Point on BN254 G1 curve (2 coordinates)
/// - `G2Point`: Point on BN254 G2 curve (4 coordinates, extension field)
/// - `Groth16Proof`: Complete proof structure (3 curve points)
/// - `*PublicInputs`: Circuit-specific public input structures
///
/// ## Field Encoding
///
/// All field elements use `felt252` which can represent BN254 field elements.
/// The BN254 prime (~254 bits) fits within felt252's range.

use starknet::ContractAddress;

/// BN254 G1 point in affine coordinates
/// Used for proof points A and C, and verification key IC points
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct G1Point {
    pub x: felt252,
    pub y: felt252,
}

/// BN254 G2 point in affine coordinates
/// Extension field Fp2: each coordinate is (c0 + c1 * i) where i^2 = -1
/// Used for proof point B and verification key beta/gamma/delta points
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct G2Point {
    /// x coordinate: x = x0 + x1 * i
    pub x0: felt252,
    pub x1: felt252,
    /// y coordinate: y = y0 + y1 * i
    pub y0: felt252,
    pub y1: felt252,
}

/// Groth16 proof structure
/// Contains three curve points that form the proof
///
/// The proof satisfies the pairing equation:
/// e(A, B) = e(alpha, beta) * e(vk_x, gamma) * e(C, delta)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct Groth16Proof {
    /// Proof point A (G1)
    pub a: G1Point,
    /// Proof point B (G2)
    pub b: G2Point,
    /// Proof point C (G1)
    pub c: G1Point,
}

/// Result of proof verification
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub enum VerificationResult {
    /// Proof is valid
    Valid,
    /// Proof is invalid with error code
    Invalid: felt252,
}

/// Check if verification result is valid
pub fn is_valid(result: VerificationResult) -> bool {
    match result {
        VerificationResult::Valid => true,
        VerificationResult::Invalid(_) => false,
    }
}

// ============================================================================
// Circuit-Specific Public Input Structures
// ============================================================================

/// Public inputs for Membership circuit (2 signals)
///
/// Proves ownership of a note in the Merkle tree without revealing details.
///
/// Circuit outputs: none (membership proof only)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct MembershipPublicInputs {
    /// Merkle tree root (must be a known root)
    pub root: felt252,
    /// Nullifier hash (prevents double-spending)
    pub nullifier_hash: felt252,
}

/// Public inputs for Swap circuit (7 signals)
///
/// Proves a valid private swap operation with change calculation.
///
/// Circuit outputs: changeCommitment (returned separately)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct SwapPublicInputs {
    /// Merkle tree root
    pub root: felt252,
    /// Input note nullifier hash
    pub nullifier_hash: felt252,
    /// Output note commitment (receiving token)
    pub new_commitment: felt252,
    /// Input token address
    pub token_in: ContractAddress,
    /// Output token address
    pub token_out: ContractAddress,
    /// Amount being swapped in (public for routing)
    pub amount_in: u256,
    /// Minimum output amount (slippage protection)
    pub amount_out_min: u256,
}

/// Public inputs for Mint (Liquidity Provision) circuit (6 signals)
///
/// Proves valid private liquidity provision to a CLMM pool.
///
/// Circuit outputs: changeCommitment0, changeCommitment1 (returned separately)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct MintPublicInputs {
    /// Merkle tree root
    pub root: felt252,
    /// Token0 input note nullifier hash
    pub nullifier_hash0: felt252,
    /// Token1 input note nullifier hash
    pub nullifier_hash1: felt252,
    /// LP position commitment (NFT-like ownership)
    pub position_commitment: felt252,
    /// Lower tick boundary (offset to unsigned: actual_tick + 887272)
    pub tick_lower: u32,
    /// Upper tick boundary (offset to unsigned: actual_tick + 887272)
    pub tick_upper: u32,
}

/// Public inputs for Burn (Liquidity Removal) circuit (6 signals)
///
/// Proves valid private liquidity removal from a CLMM pool.
///
/// Circuit outputs: none (commitments are public inputs)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct BurnPublicInputs {
    /// Merkle tree root
    pub root: felt252,
    /// Position nullifier hash
    pub position_nullifier_hash: felt252,
    /// Token0 output note commitment
    pub new_commitment0: felt252,
    /// Token1 output note commitment
    pub new_commitment1: felt252,
    /// Lower tick boundary (offset to unsigned)
    pub tick_lower: u32,
    /// Upper tick boundary (offset to unsigned)
    pub tick_upper: u32,
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/// Convert MembershipPublicInputs to array of felt252 for verifier
pub fn membership_inputs_to_array(inputs: MembershipPublicInputs) -> Array<felt252> {
    array![inputs.root, inputs.nullifier_hash]
}

/// Convert SwapPublicInputs to array of felt252 for verifier
/// Note: u256 values are split into low and high parts
pub fn swap_inputs_to_array(inputs: SwapPublicInputs) -> Array<felt252> {
    array![
        inputs.root,
        inputs.nullifier_hash,
        inputs.new_commitment,
        inputs.token_in.into(),
        inputs.token_out.into(),
        inputs.amount_in.low.into(),
        inputs.amount_in.high.into(),
        inputs.amount_out_min.low.into(),
        inputs.amount_out_min.high.into(),
    ]
}

/// Convert MintPublicInputs to array of felt252 for verifier
pub fn mint_inputs_to_array(inputs: MintPublicInputs) -> Array<felt252> {
    array![
        inputs.root,
        inputs.nullifier_hash0,
        inputs.nullifier_hash1,
        inputs.position_commitment,
        inputs.tick_lower.into(),
        inputs.tick_upper.into(),
    ]
}

/// Convert BurnPublicInputs to array of felt252 for verifier
pub fn burn_inputs_to_array(inputs: BurnPublicInputs) -> Array<felt252> {
    array![
        inputs.root,
        inputs.position_nullifier_hash,
        inputs.new_commitment0,
        inputs.new_commitment1,
        inputs.tick_lower.into(),
        inputs.tick_upper.into(),
    ]
}

// ============================================================================
// Constants
// ============================================================================

/// Number of public inputs for each circuit
pub mod PublicInputCounts {
    pub const MEMBERSHIP: u32 = 2;
    pub const SWAP: u32 = 9; // 7 signals + u256 split
    pub const MINT: u32 = 6;
    pub const BURN: u32 = 6;
}

/// Tick offset constant for converting signed ticks to unsigned
/// Ticks range from -887272 to 887272, we add this offset to make them unsigned
pub const TICK_OFFSET: u32 = 887272;

/// Maximum valid tick after offset (2 * TICK_OFFSET)
pub const MAX_TICK_OFFSET: u32 = 1774544;

// ============================================================================
// Error Codes
// ============================================================================

pub mod Errors {
    pub const INVALID_PROOF: felt252 = 'VERIFIER: invalid proof';
    pub const INVALID_PUBLIC_INPUT_COUNT: felt252 = 'VERIFIER: invalid input count';
    pub const UNKNOWN_ROOT: felt252 = 'VERIFIER: unknown root';
    pub const NULLIFIER_SPENT: felt252 = 'VERIFIER: nullifier spent';
    pub const INVALID_TICK_RANGE: felt252 = 'VERIFIER: invalid tick range';
    pub const PAIRING_CHECK_FAILED: felt252 = 'VERIFIER: pairing check failed';
    pub const CONTRACT_PAUSED: felt252 = 'VERIFIER: contract paused';
}
