/// Nullifier registry for preventing double-spending in Zylith Privacy Layer
///
/// Nullifiers are revealed when spending a note and stored on-chain to prevent
/// the same note from being spent twice. The actual nullifier value remains private;
/// only its hash is revealed and stored.
///
/// This follows the Tornado Cash model:
/// - Deposit: commitment added to Merkle tree
/// - Withdraw: nullifier_hash revealed and permanently marked as spent

/// Error messages for nullifier operations
pub mod Errors {
    pub const ALREADY_SPENT: felt252 = 'Nullifier already spent';
    pub const INVALID_NULLIFIER: felt252 = 'Invalid nullifier';
    pub const ZERO_NULLIFIER: felt252 = 'Zero nullifier not allowed';
}

/// Check if a nullifier has been spent
///
/// Note: This is a helper function signature. In actual contract use,
/// you'll access storage directly using component methods.
///
/// # Arguments
/// * `nullifier_hash` - The hash of the nullifier to check
/// * `storage_value` - The boolean value from storage
///
/// # Returns
/// True if the nullifier has been spent, false otherwise
pub fn is_nullifier_spent(storage_value: bool) -> bool {
    storage_value
}

/// Verify nullifier can be spent
///
/// This function ensures:
/// 1. The nullifier is valid (non-zero)
/// 2. The nullifier has not been spent before
///
/// # Arguments
/// * `nullifier_hash` - The hash of the nullifier to mark as spent
/// * `already_spent` - Whether the nullifier is already spent
///
/// # Panics
/// - If nullifier is zero (INVALID_NULLIFIER)
/// - If nullifier has already been spent (ALREADY_SPENT)
pub fn verify_can_spend(nullifier_hash: felt252, already_spent: bool) {
    // Verify nullifier is valid
    assert(is_valid_nullifier(nullifier_hash), Errors::INVALID_NULLIFIER);

    // Verify nullifier has not been spent
    assert(!already_spent, Errors::ALREADY_SPENT);
}

/// Verify a nullifier hash is valid
///
/// A nullifier is valid if it's non-zero. Zero nullifiers could cause
/// issues with the spending logic and Merkle proof verification.
///
/// # Arguments
/// * `nullifier_hash` - The hash of the nullifier to verify
///
/// # Returns
/// True if the nullifier is valid (non-zero)
pub fn is_valid_nullifier(nullifier_hash: felt252) -> bool {
    nullifier_hash != 0
}

/// Check if any value in array is true
///
/// # Arguments
/// * `values` - Array of boolean values
///
/// # Returns
/// True if ANY value is true
pub fn any_spent(values: Span<bool>) -> bool {
    let mut i: u32 = 0;
    let len = values.len();

    loop {
        if i >= len {
            break false;
        }

        if *values.at(i) {
            break true;
        }

        i += 1;
    }
}

/// Check if all values in array are false
///
/// # Arguments
/// * `values` - Array of boolean values
///
/// # Returns
/// True if ALL values are false
pub fn all_unspent(values: Span<bool>) -> bool {
    !any_spent(values)
}

#[cfg(test)]
mod tests {
    use super::{all_unspent, any_spent, is_nullifier_spent, is_valid_nullifier, verify_can_spend};

    #[test]
    fn test_is_valid_nullifier() {
        assert(is_valid_nullifier(123), 'Valid nullifier rejected');
        assert(!is_valid_nullifier(0), 'Zero nullifier accepted');
    }

    #[test]
    fn test_nullifier_initially_unspent() {
        let storage_value = false;
        assert(!is_nullifier_spent(storage_value), 'Nullifier should be unspent');
    }

    #[test]
    fn test_verify_can_spend() {
        let nullifier_hash: felt252 = 12345;

        // Should not panic when valid and unspent
        verify_can_spend(nullifier_hash, false);
    }

    #[test]
    #[should_panic(expected: ('Nullifier already spent',))]
    fn test_double_spend_panics() {
        let nullifier_hash: felt252 = 12345;
        verify_can_spend(nullifier_hash, true); // Should panic
    }

    #[test]
    #[should_panic(expected: ('Invalid nullifier',))]
    fn test_spend_zero_nullifier_panics() {
        verify_can_spend(0, false); // Should panic
    }

    #[test]
    fn test_any_spent() {
        let values = array![false, true, false];
        assert(any_spent(values.span()), 'Should detect spent');

        let all_unspent_values = array![false, false, false];
        assert(!any_spent(all_unspent_values.span()), 'Should detect all unspent');
    }

    #[test]
    fn test_all_unspent() {
        let values = array![false, false, false];
        assert(all_unspent(values.span()), 'All should be unspent');

        let some_spent = array![false, true, false];
        assert(!all_unspent(some_spent.span()), 'Not all unspent');
    }
}
