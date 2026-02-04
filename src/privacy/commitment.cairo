use core::hash::HashStateTrait;
/// Commitment generation and verification for Zylith Privacy Layer
///
/// Uses Poseidon hash (STARK-friendly) to generate commitments in the following structure:
/// commitment = Poseidon(Poseidon(secret, nullifier), amount_low, amount_high, token_address)
///
/// This allows:
/// - Hiding the actual deposit values
/// - Binding commitments to specific tokens
/// - Creating deterministic nullifiers for preventing double-spends

use core::poseidon::PoseidonTrait;
use starknet::ContractAddress;

/// Compute the inner hash component
///
/// This combines the secret and nullifier into a single value that forms
/// the basis of the commitment. The nullifier is used later for spending.
///
/// # Arguments
/// * `secret` - Random value known only to the note owner
/// * `nullifier` - Unique value that prevents double-spending
///
/// # Returns
/// The Poseidon hash of (secret, nullifier)
pub fn compute_inner_hash(secret: felt252, nullifier: felt252) -> felt252 {
    PoseidonTrait::new().update(secret).update(nullifier).finalize()
}

/// Compute the full commitment
///
/// Creates a commitment that binds together:
/// - The secret/nullifier pair (via inner_hash)
/// - The amount (split into low/high u128 components)
/// - The token address
///
/// This commitment is inserted into the Merkle tree and publicly visible,
/// but reveals nothing about its components.
///
/// # Arguments
/// * `secret` - Random value known only to the note owner
/// * `nullifier` - Unique value that prevents double-spending
/// * `amount` - The amount being committed (as u256)
/// * `token` - The token contract address
///
/// # Returns
/// The full commitment hash
pub fn compute_commitment(
    secret: felt252, nullifier: felt252, amount: u256, token: ContractAddress,
) -> felt252 {
    let inner_hash = compute_inner_hash(secret, nullifier);

    // Split u256 amount into low and high felt252 components
    let amount_low: felt252 = amount.low.into();
    let amount_high: felt252 = amount.high.into();

    // Convert ContractAddress to felt252
    let token_felt: felt252 = token.into();

    // Compute final commitment: Poseidon(inner_hash, amount_low, amount_high, token)
    PoseidonTrait::new()
        .update(inner_hash)
        .update(amount_low)
        .update(amount_high)
        .update(token_felt)
        .finalize()
}

/// Compute the nullifier hash for spending
///
/// When spending a note, the user reveals the nullifier hash (but not the nullifier itself).
/// This prevents double-spending while maintaining privacy.
///
/// # Arguments
/// * `nullifier` - The unique nullifier value
///
/// # Returns
/// The Poseidon hash of the nullifier
pub fn compute_nullifier_hash(nullifier: felt252) -> felt252 {
    PoseidonTrait::new().update(nullifier).finalize()
}

/// Verify a commitment is valid
///
/// A commitment is valid if it's non-zero. Zero commitments are rejected
/// to prevent edge cases in the Merkle tree.
///
/// # Arguments
/// * `commitment` - The commitment to verify
///
/// # Returns
/// True if the commitment is valid (non-zero)
pub fn is_valid_commitment(commitment: felt252) -> bool {
    commitment != 0
}

/// Verify all components needed for a commitment are valid
///
/// Ensures that:
/// - Secret is non-zero
/// - Nullifier is non-zero
/// - Amount is non-zero
/// - Token address is non-zero
///
/// # Arguments
/// * `secret` - The secret value
/// * `nullifier` - The nullifier value
/// * `amount` - The amount value
/// * `token` - The token contract address
///
/// # Returns
/// True if all components are valid
pub fn are_commitment_components_valid(
    secret: felt252, nullifier: felt252, amount: u256, token: ContractAddress,
) -> bool {
    let zero_address: ContractAddress = 0.try_into().unwrap();

    secret != 0 && nullifier != 0 && amount != 0 && token != zero_address
}

#[cfg(test)]
mod tests {
    use starknet::ContractAddress;
    use super::{
        are_commitment_components_valid, compute_commitment, compute_inner_hash,
        compute_nullifier_hash, is_valid_commitment,
    };

    #[test]
    fn test_inner_hash_deterministic() {
        let secret: felt252 = 12345;
        let nullifier: felt252 = 67890;

        let hash1 = compute_inner_hash(secret, nullifier);
        let hash2 = compute_inner_hash(secret, nullifier);

        assert(hash1 == hash2, 'Inner hash not deterministic');
        assert(hash1 != 0, 'Inner hash is zero');
    }

    #[test]
    fn test_inner_hash_different_inputs() {
        let hash1 = compute_inner_hash(111, 222);
        let hash2 = compute_inner_hash(111, 223);
        let hash3 = compute_inner_hash(112, 222);

        assert(hash1 != hash2, 'Different nullifiers same hash');
        assert(hash1 != hash3, 'Different secrets same hash');
    }

    #[test]
    fn test_commitment_deterministic() {
        let secret: felt252 = 12345;
        let nullifier: felt252 = 67890;
        let amount: u256 = 1000000;
        let token: ContractAddress = 0x123.try_into().unwrap();

        let commitment1 = compute_commitment(secret, nullifier, amount, token);
        let commitment2 = compute_commitment(secret, nullifier, amount, token);

        assert(commitment1 == commitment2, 'Commitment not deterministic');
        assert(commitment1 != 0, 'Commitment is zero');
    }

    #[test]
    fn test_commitment_different_amounts() {
        let secret: felt252 = 12345;
        let nullifier: felt252 = 67890;
        let token: ContractAddress = 0x123.try_into().unwrap();

        let commitment1 = compute_commitment(secret, nullifier, 1000, token);
        let commitment2 = compute_commitment(secret, nullifier, 2000, token);

        assert(commitment1 != commitment2, 'Different amounts same hash');
    }

    #[test]
    fn test_nullifier_hash() {
        let nullifier: felt252 = 12345;

        let hash1 = compute_nullifier_hash(nullifier);
        let hash2 = compute_nullifier_hash(nullifier);

        assert(hash1 == hash2, 'Nullifier not deterministic');
        assert(hash1 != 0, 'Nullifier hash is zero');
    }

    #[test]
    fn test_is_valid_commitment() {
        assert(is_valid_commitment(123), 'Valid commitment rejected');
        assert(!is_valid_commitment(0), 'Zero commitment accepted');
    }

    #[test]
    fn test_are_commitment_components_valid() {
        let valid_token: ContractAddress = 0x123.try_into().unwrap();
        let zero_token: ContractAddress = 0.try_into().unwrap();

        assert(are_commitment_components_valid(1, 2, 3, valid_token), 'Valid components rejected');
        assert(!are_commitment_components_valid(0, 2, 3, valid_token), 'Zero secret accepted');
        assert(!are_commitment_components_valid(1, 0, 3, valid_token), 'Zero nullifier accepted');
        assert(!are_commitment_components_valid(1, 2, 0, valid_token), 'Zero amount accepted');
        assert(!are_commitment_components_valid(1, 2, 3, zero_token), 'Zero token accepted');
    }
}
