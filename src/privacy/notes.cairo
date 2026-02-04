/// Shielded note structures for Zylith Privacy Layer
///
/// Notes represent hidden value deposits and LP positions. The note data is stored
/// off-chain by the user, while only the commitment is stored on-chain in the Merkle tree.
///
/// Two types of shielded assets:
/// 1. Notes - Simple value deposits (like Tornado Cash notes)
/// 2. ShieldedPositions - Hidden LP positions with commitment-based ownership

use starknet::ContractAddress;
use super::commitment::{
    are_commitment_components_valid, compute_commitment, compute_nullifier_hash,
};

/// A shielded note representing a hidden deposit
///
/// The user stores this data off-chain. Only the commitment derived from these
/// values is stored on-chain in the Merkle tree.
///
/// # Fields
/// * `secret` - Random value known only to note owner (32 bytes of entropy)
/// * `nullifier` - Unique value for preventing double-spending
/// * `amount` - The amount of tokens in the note
/// * `token` - The token contract address
/// * `leaf_index` - Position in the Merkle tree (assigned on deposit)
#[derive(Drop, Copy, Serde)]
pub struct Note {
    pub secret: felt252,
    pub nullifier: felt252,
    pub amount: u256,
    pub token: ContractAddress,
    pub leaf_index: u32,
}

/// A shielded LP position with commitment-based ownership
///
/// Represents a hidden liquidity position in a CLMM pool. The position is owned
/// by whoever knows the secret/nullifier, not by an address.
///
/// # Fields
/// * `commitment` - The commitment that owns this position
/// * `pool_key` - Hash identifying the pool
/// * `tick_lower` - Lower tick of the position range
/// * `tick_upper` - Upper tick of the position range
/// * `liquidity` - Amount of liquidity in the position
/// * `fee_growth_inside_0` - Fee growth for token0 (for fee calculation)
/// * `fee_growth_inside_1` - Fee growth for token1 (for fee calculation)
#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct ShieldedPosition {
    pub commitment: felt252,
    pub pool_key: felt252,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: u128,
    pub fee_growth_inside_0: u256,
    pub fee_growth_inside_1: u256,
}

/// Event emitted when a new deposit is made
///
/// This event allows users to discover their notes by monitoring the chain,
/// then attempting to decrypt/match commitments with their secret values.
#[derive(Drop, starknet::Event)]
pub struct Deposit {
    #[key]
    pub commitment: felt252,
    pub leaf_index: u32,
    pub timestamp: u64,
}

/// Event emitted when a withdrawal is made
///
/// The nullifier_hash is revealed, preventing double-spends while maintaining
/// privacy about which deposit was withdrawn.
#[derive(Drop, starknet::Event)]
pub struct Withdrawal {
    #[key]
    pub nullifier_hash: felt252,
    pub recipient: ContractAddress,
    pub timestamp: u64,
}

/// Event emitted when a shielded position is opened
#[derive(Drop, starknet::Event)]
pub struct PositionOpened {
    #[key]
    pub commitment: felt252,
    #[key]
    pub pool_key: felt252,
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub liquidity: u128,
    pub timestamp: u64,
}

/// Event emitted when a shielded position is closed
#[derive(Drop, starknet::Event)]
pub struct PositionClosed {
    #[key]
    pub commitment: felt252,
    #[key]
    pub nullifier_hash: felt252,
    pub timestamp: u64,
}

/// Event emitted when fees are collected from a shielded position
#[derive(Drop, starknet::Event)]
pub struct FeesCollected {
    #[key]
    pub commitment: felt252,
    pub amount_0: u256,
    pub amount_1: u256,
    pub timestamp: u64,
}

/// Create a note from its components
///
/// # Arguments
/// * `secret` - Random value known only to note owner
/// * `nullifier` - Unique value for preventing double-spending
/// * `amount` - The amount of tokens
/// * `token` - The token contract address
/// * `leaf_index` - Position in the Merkle tree
///
/// # Returns
/// A new Note instance
pub fn create_note(
    secret: felt252, nullifier: felt252, amount: u256, token: ContractAddress, leaf_index: u32,
) -> Note {
    Note { secret, nullifier, amount, token, leaf_index }
}

/// Compute the commitment from a note
///
/// This is the public value stored in the Merkle tree.
///
/// # Arguments
/// * `note` - Reference to the note
///
/// # Returns
/// The commitment hash
pub fn note_to_commitment(note: @Note) -> felt252 {
    compute_commitment(*note.secret, *note.nullifier, *note.amount, *note.token)
}

/// Compute the nullifier hash from a note
///
/// This is revealed when spending the note.
///
/// # Arguments
/// * `note` - Reference to the note
///
/// # Returns
/// The nullifier hash
pub fn note_to_nullifier_hash(note: @Note) -> felt252 {
    compute_nullifier_hash(*note.nullifier)
}

/// Validate that a note has valid components
///
/// Checks that all required fields are non-zero and valid.
///
/// # Arguments
/// * `note` - Reference to the note
///
/// # Returns
/// True if the note is valid
pub fn is_valid_note(note: @Note) -> bool {
    are_commitment_components_valid(*note.secret, *note.nullifier, *note.amount, *note.token)
}

/// Create a shielded position
///
/// # Arguments
/// * `commitment` - The commitment owning this position
/// * `pool_key` - Hash identifying the pool
/// * `tick_lower` - Lower tick bound
/// * `tick_upper` - Upper tick bound
/// * `liquidity` - Initial liquidity amount
///
/// # Returns
/// A new ShieldedPosition instance
pub fn create_shielded_position(
    commitment: felt252, pool_key: felt252, tick_lower: i32, tick_upper: i32, liquidity: u128,
) -> ShieldedPosition {
    ShieldedPosition {
        commitment,
        pool_key,
        tick_lower,
        tick_upper,
        liquidity,
        fee_growth_inside_0: 0,
        fee_growth_inside_1: 0,
    }
}

/// Validate that a shielded position has valid parameters
///
/// Checks:
/// - Commitment is non-zero
/// - Pool key is non-zero
/// - Tick range is valid (lower < upper)
/// - Liquidity is non-zero
///
/// # Arguments
/// * `position` - Reference to the position
///
/// # Returns
/// True if the position is valid
pub fn is_valid_position(position: @ShieldedPosition) -> bool {
    *position.commitment != 0
        && *position.pool_key != 0
        && *position.tick_lower < *position.tick_upper
        && *position.liquidity != 0
}

/// Update position liquidity (for adds/removes)
///
/// # Arguments
/// * `position` - Mutable reference to position
/// * `liquidity_delta` - Change in liquidity (can be negative via i128)
///
/// Note: In production, this would need to handle i128 properly.
/// For now, we assume only additions.
pub fn update_position_liquidity(ref position: ShieldedPosition, liquidity_delta: u128) {
    position.liquidity += liquidity_delta;
}

/// Update position fee growth trackers
///
/// Called when collecting fees to update the position's last known fee growth values.
///
/// # Arguments
/// * `position` - Mutable reference to position
/// * `fee_growth_inside_0` - Current fee growth for token0
/// * `fee_growth_inside_1` - Current fee growth for token1
pub fn update_position_fees(
    ref position: ShieldedPosition, fee_growth_inside_0: u256, fee_growth_inside_1: u256,
) {
    position.fee_growth_inside_0 = fee_growth_inside_0;
    position.fee_growth_inside_1 = fee_growth_inside_1;
}

#[cfg(test)]
mod tests {
    use starknet::ContractAddress;
    use super::{
        create_note, create_shielded_position, is_valid_note, is_valid_position,
        note_to_commitment, note_to_nullifier_hash, update_position_fees, update_position_liquidity,
    };

    #[test]
    fn test_create_note() {
        let token: ContractAddress = 0x123.try_into().unwrap();
        let note = create_note(111, 222, 1000, token, 0);

        assert(note.secret == 111, 'Wrong secret');
        assert(note.nullifier == 222, 'Wrong nullifier');
        assert(note.amount == 1000, 'Wrong amount');
        assert(note.token == token, 'Wrong token');
        assert(note.leaf_index == 0, 'Wrong leaf index');
    }

    #[test]
    fn test_note_to_commitment() {
        let token: ContractAddress = 0x123.try_into().unwrap();
        let note = create_note(111, 222, 1000, token, 0);

        let commitment = note_to_commitment(@note);
        assert(commitment != 0, 'Commitment is zero');

        // Deterministic
        let commitment2 = note_to_commitment(@note);
        assert(commitment == commitment2, 'Not deterministic');
    }

    #[test]
    fn test_note_to_nullifier_hash() {
        let token: ContractAddress = 0x123.try_into().unwrap();
        let note = create_note(111, 222, 1000, token, 0);

        let nullifier_hash = note_to_nullifier_hash(@note);
        assert(nullifier_hash != 0, 'Nullifier hash is zero');

        // Deterministic
        let nullifier_hash2 = note_to_nullifier_hash(@note);
        assert(nullifier_hash == nullifier_hash2, 'Not deterministic');
    }

    #[test]
    fn test_is_valid_note() {
        let token: ContractAddress = 0x123.try_into().unwrap();
        let zero_token: ContractAddress = 0.try_into().unwrap();

        let valid_note = create_note(111, 222, 1000, token, 0);
        assert(is_valid_note(@valid_note), 'Valid note rejected');

        let invalid_note1 = create_note(0, 222, 1000, token, 0);
        assert(!is_valid_note(@invalid_note1), 'Zero secret accepted');

        let invalid_note2 = create_note(111, 0, 1000, token, 0);
        assert(!is_valid_note(@invalid_note2), 'Zero nullifier accepted');

        let invalid_note3 = create_note(111, 222, 0, token, 0);
        assert(!is_valid_note(@invalid_note3), 'Zero amount accepted');

        let invalid_note4 = create_note(111, 222, 1000, zero_token, 0);
        assert(!is_valid_note(@invalid_note4), 'Zero token accepted');
    }

    #[test]
    fn test_create_shielded_position() {
        let position = create_shielded_position(
            12345, // commitment
            67890, // pool_key
            -100, // tick_lower
            100, // tick_upper
            1000000 // liquidity
        );

        assert(position.commitment == 12345, 'Wrong commitment');
        assert(position.pool_key == 67890, 'Wrong pool key');
        assert(position.tick_lower == -100, 'Wrong tick lower');
        assert(position.tick_upper == 100, 'Wrong tick upper');
        assert(position.liquidity == 1000000, 'Wrong liquidity');
        assert(position.fee_growth_inside_0 == 0, 'Fee growth 0 not zero');
        assert(position.fee_growth_inside_1 == 0, 'Fee growth 1 not zero');
    }

    #[test]
    fn test_is_valid_position() {
        let valid_position = create_shielded_position(12345, 67890, -100, 100, 1000000);
        assert(is_valid_position(@valid_position), 'Valid position rejected');

        let invalid_position1 = create_shielded_position(0, 67890, -100, 100, 1000000);
        assert(!is_valid_position(@invalid_position1), 'Zero commitment accepted');

        let invalid_position2 = create_shielded_position(12345, 0, -100, 100, 1000000);
        assert(!is_valid_position(@invalid_position2), 'Zero pool key accepted');

        let invalid_position3 = create_shielded_position(12345, 67890, 100, -100, 1000000);
        assert(!is_valid_position(@invalid_position3), 'Invalid tick range accepted');

        let invalid_position4 = create_shielded_position(12345, 67890, -100, 100, 0);
        assert(!is_valid_position(@invalid_position4), 'Zero liquidity accepted');
    }

    #[test]
    fn test_update_position_liquidity() {
        let mut position = create_shielded_position(12345, 67890, -100, 100, 1000000);

        update_position_liquidity(ref position, 500000);
        assert(position.liquidity == 1500000, 'Liquidity not updated');
    }

    #[test]
    fn test_update_position_fees() {
        let mut position = create_shielded_position(12345, 67890, -100, 100, 1000000);

        update_position_fees(ref position, 12345, 67890);
        assert(position.fee_growth_inside_0 == 12345, 'Fee growth 0 not updated');
        assert(position.fee_growth_inside_1 == 67890, 'Fee growth 1 not updated');
    }
}
