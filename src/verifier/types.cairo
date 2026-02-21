/// Zylith Verifier Types
///
/// Data structures for Groth16 proof verification with Garaga on Starknet.
///
/// ## Public Input Structures
///
/// Each circuit has a typed struct for its public inputs.
/// The Garaga verifier returns public inputs as `Span<u256>` in Circom's
/// public signal order: outputs first, then public inputs.
///
/// ## Public Input Ordering (from Garaga verifier)
///
/// - Membership (6): [root, nullifierHash, recipient, amount_low, amount_high, token]
/// - Swap (8): [changeCommitment, root, nullifierHash, newCommitment, tokenIn, tokenOut, amountIn,
/// amountOutMin]
/// - Mint (8): [changeCommitment0, changeCommitment1, root, nullifierHash0, nullifierHash1,
/// positionCommitment, tickLower, tickUpper]
/// - Burn (6): [root, positionNullifierHash, newCommitment0, newCommitment1, tickLower, tickUpper]

use starknet::ContractAddress;
use crate::types::{Tick, TickTrait};

// ============================================================================
// Circuit-Specific Public Input Structures
// ============================================================================
// NOTE: BN254 Poseidon hash outputs (root, nullifier_hash, commitment) are
// BN254 scalar field elements (~2^254) which exceed the Stark field (~2^251).
// These MUST be stored as u256, not felt252.

/// Public inputs for Membership circuit (6 signals)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct MembershipPublicInputs {
    pub root: u256,
    pub nullifier_hash: u256,
    pub recipient: ContractAddress,
    pub amount_low: u128,
    pub amount_high: u128,
    pub token: ContractAddress,
}

/// Public inputs for Swap circuit (8 signals)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct SwapPublicInputs {
    pub change_commitment: u256,
    pub root: u256,
    pub nullifier_hash: u256,
    pub new_commitment: u256,
    pub token_in: ContractAddress,
    pub token_out: ContractAddress,
    pub amount_in: u256,
    pub amount_out_min: u256,
}

/// Public inputs for Mint circuit (8 signals)
#[derive(Drop, Copy, Serde, PartialEq)]
pub struct MintPublicInputs {
    pub change_commitment0: u256,
    pub change_commitment1: u256,
    pub root: u256,
    pub nullifier_hash0: u256,
    pub nullifier_hash1: u256,
    pub position_commitment: u256,
    pub tick_lower: Tick,
    pub tick_upper: Tick,
}

/// Public inputs for Burn circuit (6 signals)
#[derive(Drop, Copy, Serde, PartialEq)]
pub struct BurnPublicInputs {
    pub root: u256,
    pub position_nullifier_hash: u256,
    pub new_commitment0: u256,
    pub new_commitment1: u256,
    pub tick_lower: Tick,
    pub tick_upper: Tick,
}

// ============================================================================
// Public Input Extraction from Garaga Span<u256>
// ============================================================================

/// Extract MembershipPublicInputs from Garaga verifier result
/// Garaga order: [root, nullifierHash, recipient, amount_low, amount_high, token]
pub fn extract_membership_inputs(inputs: Span<u256>) -> MembershipPublicInputs {
    assert(inputs.len() == PublicInputCounts::MEMBERSHIP, Errors::INVALID_PUBLIC_INPUT_COUNT);

    // amount_low and amount_high are u128 values, safe to cast
    let amount_low: u128 = (*inputs.at(3)).try_into().expect('invalid amount_low');
    let amount_high: u128 = (*inputs.at(4)).try_into().expect('invalid amount_high');

    MembershipPublicInputs {
        root: *inputs.at(0),
        nullifier_hash: *inputs.at(1),
        recipient: u256_to_felt(*inputs.at(2)).try_into().expect('invalid recipient'),
        amount_low,
        amount_high,
        token: u256_to_felt(*inputs.at(5)).try_into().expect('invalid token'),
    }
}

/// Extract SwapPublicInputs from Garaga verifier result
/// Garaga order: [changeCommitment, root, nullifierHash, newCommitment, tokenIn, tokenOut,
/// amountIn, amountOutMin]
pub fn extract_swap_inputs(inputs: Span<u256>) -> SwapPublicInputs {
    assert(inputs.len() == PublicInputCounts::SWAP, Errors::INVALID_PUBLIC_INPUT_COUNT);
    SwapPublicInputs {
        change_commitment: *inputs.at(0),
        root: *inputs.at(1),
        nullifier_hash: *inputs.at(2),
        new_commitment: *inputs.at(3),
        token_in: u256_to_felt(*inputs.at(4)).try_into().expect('invalid token_in'),
        token_out: u256_to_felt(*inputs.at(5)).try_into().expect('invalid token_out'),
        amount_in: *inputs.at(6),
        amount_out_min: *inputs.at(7),
    }
}

/// Extract MintPublicInputs from Garaga verifier result
/// Garaga order: [changeCommitment0, changeCommitment1, root, nullifierHash0, nullifierHash1,
/// positionCommitment, tickLower, tickUpper]
pub fn extract_mint_inputs(inputs: Span<u256>) -> MintPublicInputs {
    assert(inputs.len() == PublicInputCounts::MINT, Errors::INVALID_PUBLIC_INPUT_COUNT);
    MintPublicInputs {
        change_commitment0: *inputs.at(0),
        change_commitment1: *inputs.at(1),
        root: *inputs.at(2),
        nullifier_hash0: *inputs.at(3),
        nullifier_hash1: *inputs.at(4),
        position_commitment: *inputs.at(5),
        tick_lower: TickTrait::from_i32(offset_tick_to_signed(u256_to_u32(*inputs.at(6)))),
        tick_upper: TickTrait::from_i32(offset_tick_to_signed(u256_to_u32(*inputs.at(7)))),
    }
}

/// Extract BurnPublicInputs from Garaga verifier result
/// Garaga order: [root, positionNullifierHash, newCommitment0, newCommitment1, tickLower,
/// tickUpper]
pub fn extract_burn_inputs(inputs: Span<u256>) -> BurnPublicInputs {
    assert(inputs.len() == PublicInputCounts::BURN, Errors::INVALID_PUBLIC_INPUT_COUNT);
    BurnPublicInputs {
        root: *inputs.at(0),
        position_nullifier_hash: *inputs.at(1),
        new_commitment0: *inputs.at(2),
        new_commitment1: *inputs.at(3),
        tick_lower: TickTrait::from_i32(offset_tick_to_signed(u256_to_u32(*inputs.at(4)))),
        tick_upper: TickTrait::from_i32(offset_tick_to_signed(u256_to_u32(*inputs.at(5)))),
    }
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/// Convert u256 to felt252 (safe for Starknet addresses and small values)
fn u256_to_felt(value: u256) -> felt252 {
    value.try_into().expect('u256 overflow for felt252')
}

/// Convert u256 to u32 (for tick values)
fn u256_to_u32(value: u256) -> u32 {
    value.try_into().expect('u256 overflow for u32')
}

// ============================================================================
// Constants
// ============================================================================

/// Number of public inputs for each circuit (from Garaga N_PUBLIC_INPUTS)
pub mod PublicInputCounts {
    pub const MEMBERSHIP: u32 = 6;
    pub const SWAP: u32 = 8;
    pub const MINT: u32 = 8;
    pub const BURN: u32 = 6;
}

/// Tick offset constant for converting signed ticks to unsigned
/// Circom circuits use unsigned ticks: offset_tick = signed_tick + TICK_OFFSET
pub const TICK_OFFSET: u32 = 887272;

/// Maximum valid tick after offset (2 * TICK_OFFSET)
pub const MAX_TICK_OFFSET: u32 = 1774544;

/// Convert unsigned tick from proof (u32 with TICK_OFFSET) to signed i32 for CLMM
/// offset_tick = signed_tick + TICK_OFFSET => signed_tick = offset_tick - TICK_OFFSET
pub fn offset_tick_to_signed(offset_tick: u32) -> i32 {
    let offset_i32: i32 = TICK_OFFSET.try_into().unwrap();
    let tick_i32: i32 = offset_tick.try_into().unwrap();
    tick_i32 - offset_i32
}

// ============================================================================
// Error Codes
// ============================================================================

pub mod Errors {
    pub const INVALID_PROOF: felt252 = 'VERIFIER: invalid proof';
    pub const INVALID_PUBLIC_INPUT_COUNT: felt252 = 'VERIFIER: invalid input count';
    pub const UNKNOWN_ROOT: felt252 = 'VERIFIER: unknown root';
    pub const NULLIFIER_SPENT: felt252 = 'VERIFIER: nullifier spent';
    pub const INVALID_TICK_RANGE: felt252 = 'VERIFIER: invalid tick range';
    pub const CONTRACT_PAUSED: felt252 = 'VERIFIER: contract paused';
    pub const INVALID_COMMITMENT: felt252 = 'VERIFIER: invalid commitment';
}
