/// Fee tier and calculation logic for CLMM

/// Fee tier structure
#[derive(Copy, Drop, Serde, starknet::Store, PartialEq)]
pub struct FeeTier {
    pub fee: u32, // Fee in basis points (e.g., 3000 = 0.30%)
    pub tick_spacing: u32 // Minimum tick spacing for this fee tier
}

/// Standard fee tiers
pub mod StandardFeeTiers {
    use super::FeeTier;

    /// 0.01% fee with 1 tick spacing
    pub fn fee_tier_1() -> FeeTier {
        FeeTier { fee: 100, tick_spacing: 1 }
    }

    /// 0.05% fee with 10 tick spacing
    pub fn fee_tier_5() -> FeeTier {
        FeeTier { fee: 500, tick_spacing: 10 }
    }

    /// 0.30% fee with 60 tick spacing
    pub fn fee_tier_30() -> FeeTier {
        FeeTier { fee: 3000, tick_spacing: 60 }
    }

    /// 1.00% fee with 200 tick spacing
    pub fn fee_tier_100() -> FeeTier {
        FeeTier { fee: 10000, tick_spacing: 200 }
    }
}

/// Fee constants
pub mod FeeConstants {
    /// Maximum fee: 10% (1000000 basis points / 10000 = 100%)
    pub const MAX_FEE: u32 = 100000;

    /// Protocol fee denominator (protocol gets fee/PROTOCOL_FEE_DENOMINATOR)
    pub const PROTOCOL_FEE_DENOMINATOR: u32 = 10;
}

/// Errors
pub mod Errors {
    pub const INVALID_FEE: felt252 = 'Invalid fee';
    pub const INVALID_PROTOCOL_FEE: felt252 = 'Invalid protocol fee';
}

/// Calculate swap fee amount
/// amount_in * fee / 1000000
pub fn calculate_fee_amount(amount_in: u256, fee: u32) -> u256 {
    assert(fee <= FeeConstants::MAX_FEE, Errors::INVALID_FEE);

    let fee_u256: u256 = fee.into();
    (amount_in * fee_u256) / 1000000
}

/// Calculate amount after fee deduction
pub fn amount_after_fee(amount_in: u256, fee: u32) -> u256 {
    let fee_amount = calculate_fee_amount(amount_in, fee);
    amount_in - fee_amount
}

/// Calculate protocol fee from total fee
/// Protocol gets a fraction of the total fee
pub fn calculate_protocol_fee(fee_amount: u256, protocol_fee_fraction: u8) -> u256 {
    assert(protocol_fee_fraction <= 10, Errors::INVALID_PROTOCOL_FEE);

    if protocol_fee_fraction == 0 {
        return 0;
    }

    (fee_amount * protocol_fee_fraction.into()) / FeeConstants::PROTOCOL_FEE_DENOMINATOR.into()
}

/// Fee growth calculation
/// Fee growth is stored as a Q128.128 fixed point number
/// It represents the cumulative fees per unit of liquidity

/// Update fee growth
/// Returns new fee_growth_global
pub fn update_fee_growth(fee_growth_global: u256, fee_amount: u256, liquidity: u128) -> u256 {
    if liquidity == 0 {
        return fee_growth_global;
    }

    // Fee growth = fee_amount / liquidity (in Q128.128)
    let liquidity_u256: u256 = liquidity.into();
    let fee_per_liquidity = (fee_amount * 0x100000000000000000000000000000000) / liquidity_u256;

    fee_growth_global + fee_per_liquidity
}

/// Calculate fees earned by a position
/// Uses the fee growth inside the position's range
pub fn calculate_position_fees(
    fee_growth_inside_0: u256,
    fee_growth_inside_1: u256,
    liquidity: u128,
    fee_growth_inside_0_last: u256,
    fee_growth_inside_1_last: u256,
) -> (u256, u256) {
    let liquidity_u256: u256 = liquidity.into();

    // Fees for token0
    let fee_growth_delta_0 = fee_growth_inside_0 - fee_growth_inside_0_last;
    let fees_0 = (liquidity_u256 * fee_growth_delta_0) / 0x100000000000000000000000000000000;

    // Fees for token1
    let fee_growth_delta_1 = fee_growth_inside_1 - fee_growth_inside_1_last;
    let fees_1 = (liquidity_u256 * fee_growth_delta_1) / 0x100000000000000000000000000000000;

    (fees_0, fees_1)
}

/// Calculate fee growth inside a tick range
/// This is used to determine fees earned by a position
pub fn get_fee_growth_inside(
    tick_lower: i32,
    tick_upper: i32,
    tick_current: i32,
    fee_growth_global_0: u256,
    fee_growth_global_1: u256,
    fee_growth_outside_lower_0: u256,
    fee_growth_outside_lower_1: u256,
    fee_growth_outside_upper_0: u256,
    fee_growth_outside_upper_1: u256,
) -> (u256, u256) {
    // Calculate fee growth below lower tick
    let (fee_growth_below_0, fee_growth_below_1) = if tick_current >= tick_lower {
        (fee_growth_outside_lower_0, fee_growth_outside_lower_1)
    } else {
        (
            fee_growth_global_0 - fee_growth_outside_lower_0,
            fee_growth_global_1 - fee_growth_outside_lower_1,
        )
    };

    // Calculate fee growth above upper tick
    let (fee_growth_above_0, fee_growth_above_1) = if tick_current < tick_upper {
        (fee_growth_outside_upper_0, fee_growth_outside_upper_1)
    } else {
        (
            fee_growth_global_0 - fee_growth_outside_upper_0,
            fee_growth_global_1 - fee_growth_outside_upper_1,
        )
    };

    // Fee growth inside = global - below - above
    let fee_growth_inside_0 = fee_growth_global_0 - fee_growth_below_0 - fee_growth_above_0;
    let fee_growth_inside_1 = fee_growth_global_1 - fee_growth_below_1 - fee_growth_above_1;

    (fee_growth_inside_0, fee_growth_inside_1)
}

#[cfg(test)]
mod tests {
    use super::{amount_after_fee, calculate_fee_amount, calculate_protocol_fee, update_fee_growth};

    #[test]
    fn test_calculate_fee_amount() {
        // 0.30% fee on 1000 tokens = 3 tokens
        let fee = calculate_fee_amount(1000, 3000);
        assert(fee == 3, 'Should be 3');
    }

    #[test]
    fn test_amount_after_fee() {
        // 1000 - 0.30% = 997
        let amount = amount_after_fee(1000, 3000);
        assert(amount == 997, 'Should be 997');
    }

    #[test]
    fn test_calculate_protocol_fee() {
        // 10% of 100 = 10
        let protocol_fee = calculate_protocol_fee(100, 1);
        assert(protocol_fee == 10, 'Should be 10');

        // 0% of 100 = 0
        let protocol_fee = calculate_protocol_fee(100, 0);
        assert(protocol_fee == 0, 'Should be 0');
    }

    #[test]
    fn test_update_fee_growth() {
        let fee_growth = update_fee_growth(0, 1000, 10000);
        assert(fee_growth > 0, 'Fee growth should increase');

        // No change if liquidity is zero
        let fee_growth = update_fee_growth(100, 1000, 0);
        assert(fee_growth == 100, 'Should not change');
    }
}
