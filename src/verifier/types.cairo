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
/// - Membership (2): [root, nullifierHash]
/// - Swap (8): [changeCommitment, root, nullifierHash, newCommitment, tokenIn, tokenOut, amountIn,
/// amountOutMin]
/// - Mint (8): [changeCommitment0, changeCommitment1, root, nullifierHash0, nullifierHash1,
/// positionCommitment, tickLower, tickUpper]
/// - Burn (6): [root, positionNullifierHash, newCommitment0, newCommitment1, tickLower, tickUpper]

use starknet::ContractAddress;

// ============================================================================
// Circuit-Specific Public Input Structures
// ============================================================================

/// Public inputs for Membership circuit (2 signals)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct MembershipPublicInputs {
    pub root: felt252,
    pub nullifier_hash: felt252,
}

/// Public inputs for Swap circuit (8 signals)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct SwapPublicInputs {
    pub change_commitment: felt252,
    pub root: felt252,
    pub nullifier_hash: felt252,
    pub new_commitment: felt252,
    pub token_in: ContractAddress,
    pub token_out: ContractAddress,
    pub amount_in: u256,
    pub amount_out_min: u256,
}

/// Public inputs for Mint circuit (8 signals)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct MintPublicInputs {
    pub change_commitment0: felt252,
    pub change_commitment1: felt252,
    pub root: felt252,
    pub nullifier_hash0: felt252,
    pub nullifier_hash1: felt252,
    pub position_commitment: felt252,
    pub tick_lower: u32,
    pub tick_upper: u32,
}

/// Public inputs for Burn circuit (6 signals)
#[derive(Drop, Copy, Serde, PartialEq, Debug)]
pub struct BurnPublicInputs {
    pub root: felt252,
    pub position_nullifier_hash: felt252,
    pub new_commitment0: felt252,
    pub new_commitment1: felt252,
    pub tick_lower: u32,
    pub tick_upper: u32,
}

// ============================================================================
// Public Input Extraction from Garaga Span<u256>
// ============================================================================

/// Extract MembershipPublicInputs from Garaga verifier result
/// Garaga order: [root, nullifierHash]
pub fn extract_membership_inputs(inputs: Span<u256>) -> MembershipPublicInputs {
    assert(inputs.len() == PublicInputCounts::MEMBERSHIP, Errors::INVALID_PUBLIC_INPUT_COUNT);
    MembershipPublicInputs {
        root: u256_to_felt(*inputs.at(0)), nullifier_hash: u256_to_felt(*inputs.at(1)),
    }
}

/// Extract SwapPublicInputs from Garaga verifier result
/// Garaga order: [changeCommitment, root, nullifierHash, newCommitment, tokenIn, tokenOut,
/// amountIn, amountOutMin]
pub fn extract_swap_inputs(inputs: Span<u256>) -> SwapPublicInputs {
    assert(inputs.len() == PublicInputCounts::SWAP, Errors::INVALID_PUBLIC_INPUT_COUNT);
    SwapPublicInputs {
        change_commitment: u256_to_felt(*inputs.at(0)),
        root: u256_to_felt(*inputs.at(1)),
        nullifier_hash: u256_to_felt(*inputs.at(2)),
        new_commitment: u256_to_felt(*inputs.at(3)),
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
        change_commitment0: u256_to_felt(*inputs.at(0)),
        change_commitment1: u256_to_felt(*inputs.at(1)),
        root: u256_to_felt(*inputs.at(2)),
        nullifier_hash0: u256_to_felt(*inputs.at(3)),
        nullifier_hash1: u256_to_felt(*inputs.at(4)),
        position_commitment: u256_to_felt(*inputs.at(5)),
        tick_lower: u256_to_u32(*inputs.at(6)),
        tick_upper: u256_to_u32(*inputs.at(7)),
    }
}

/// Extract BurnPublicInputs from Garaga verifier result
/// Garaga order: [root, positionNullifierHash, newCommitment0, newCommitment1, tickLower,
/// tickUpper]
pub fn extract_burn_inputs(inputs: Span<u256>) -> BurnPublicInputs {
    assert(inputs.len() == PublicInputCounts::BURN, Errors::INVALID_PUBLIC_INPUT_COUNT);
    BurnPublicInputs {
        root: u256_to_felt(*inputs.at(0)),
        position_nullifier_hash: u256_to_felt(*inputs.at(1)),
        new_commitment0: u256_to_felt(*inputs.at(2)),
        new_commitment1: u256_to_felt(*inputs.at(3)),
        tick_lower: u256_to_u32(*inputs.at(4)),
        tick_upper: u256_to_u32(*inputs.at(5)),
    }
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/// Convert u256 to felt252 (safe for BN254 field elements)
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
    pub const MEMBERSHIP: u32 = 2;
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
}
