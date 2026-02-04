/// Position management for CLMM
/// Tracks liquidity provider positions with their tick ranges and fee accounting
use starknet::ContractAddress;
use super::math::liquidity::{get_amount_0_delta, get_amount_1_delta};
use super::math::tick_math::{get_sqrt_price_at_tick, is_tick_aligned, validate_tick};

/// Position information
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct Position {
    pub liquidity: u128, // Amount of liquidity owned
    pub fee_growth_inside_0_last: u256, // Last recorded fee growth inside for token0
    pub fee_growth_inside_1_last: u256, // Last recorded fee growth inside for token1
    pub tokens_owed_0: u128, // Fees owed to position in token0
    pub tokens_owed_1: u128 // Fees owed to position in token1
}

/// Position key to uniquely identify a position
#[derive(Copy, Drop, Serde, Hash)]
pub struct PositionKey {
    pub owner: ContractAddress,
    pub tick_lower: i32,
    pub tick_upper: i32,
}

/// Mint/Burn result
#[derive(Copy, Drop, Serde)]
pub struct ModifyPositionResult {
    pub amount_0: u256,
    pub amount_1: u256,
}

/// Errors
pub mod Errors {
    pub const INVALID_TICK_RANGE: felt252 = 'Invalid tick range';
    pub const TICK_LOWER_GTE_UPPER: felt252 = 'Tick lower >= upper';
    pub const ZERO_LIQUIDITY: felt252 = 'Zero liquidity';
    pub const INSUFFICIENT_LIQUIDITY: felt252 = 'Insufficient liquidity';
    pub const TICK_NOT_ALIGNED: felt252 = 'Tick not aligned';
}

/// Initialize a new position
pub fn initialize_position() -> Position {
    Position {
        liquidity: 0,
        fee_growth_inside_0_last: 0,
        fee_growth_inside_1_last: 0,
        tokens_owed_0: 0,
        tokens_owed_1: 0,
    }
}

/// Validate position parameters
pub fn validate_position_params(tick_lower: i32, tick_upper: i32, tick_spacing: u32) {
    // Validate tick bounds
    validate_tick(tick_lower);
    validate_tick(tick_upper);

    // Ensure tick_lower < tick_upper
    assert(tick_lower < tick_upper, Errors::TICK_LOWER_GTE_UPPER);

    // Ensure ticks are aligned to spacing
    assert(is_tick_aligned(tick_lower, tick_spacing), Errors::TICK_NOT_ALIGNED);
    assert(is_tick_aligned(tick_upper, tick_spacing), Errors::TICK_NOT_ALIGNED);
}

/// Update position with new liquidity
/// Returns (position, amount_0, amount_1)
pub fn update_position(
    mut position: Position,
    liquidity_delta: i128,
    fee_growth_inside_0: u256,
    fee_growth_inside_1: u256,
) -> Position {
    // Update fees owed before changing liquidity
    if position.liquidity > 0 {
        let (fees_0, fees_1) = super::fees::calculate_position_fees(
            fee_growth_inside_0,
            fee_growth_inside_1,
            position.liquidity,
            position.fee_growth_inside_0_last,
            position.fee_growth_inside_1_last,
        );

        position.tokens_owed_0 += fees_0.try_into().expect('Fee overflow');
        position.tokens_owed_1 += fees_1.try_into().expect('Fee overflow');
    }

    // Update fee growth checkpoints
    position.fee_growth_inside_0_last = fee_growth_inside_0;
    position.fee_growth_inside_1_last = fee_growth_inside_1;

    // Update liquidity
    if liquidity_delta != 0 {
        if liquidity_delta < 0 {
            let delta_abs: u128 = (liquidity_delta * -1).try_into().unwrap();
            assert(position.liquidity >= delta_abs, Errors::INSUFFICIENT_LIQUIDITY);
            position.liquidity -= delta_abs;
        } else {
            let delta_abs: u128 = liquidity_delta.try_into().unwrap();
            position.liquidity += delta_abs;
        }
    }

    position
}

/// Calculate token amounts for a liquidity change
pub fn get_amounts_for_liquidity(
    sqrt_price: u256, sqrt_price_lower: u256, sqrt_price_upper: u256, liquidity_delta: i128,
) -> (u256, u256) {
    let liquidity_abs: u128 = if liquidity_delta < 0 {
        (liquidity_delta * -1).try_into().unwrap()
    } else {
        liquidity_delta.try_into().unwrap()
    };

    let (amount_0, amount_1) = if sqrt_price <= sqrt_price_lower {
        // Current price below range - only token0 needed
        (get_amount_0_delta(sqrt_price_lower, sqrt_price_upper, liquidity_abs, true), 0)
    } else if sqrt_price < sqrt_price_upper {
        // Current price in range - both tokens needed
        (
            get_amount_0_delta(sqrt_price, sqrt_price_upper, liquidity_abs, true),
            get_amount_1_delta(sqrt_price_lower, sqrt_price, liquidity_abs, true),
        )
    } else {
        // Current price above range - only token1 needed
        (0, get_amount_1_delta(sqrt_price_lower, sqrt_price_upper, liquidity_abs, true))
    };

    (amount_0, amount_1)
}

/// Mint liquidity to a position
pub fn mint_position(
    mut position: Position,
    tick_lower: i32,
    tick_upper: i32,
    tick_spacing: u32,
    liquidity: u128,
    sqrt_price: u256,
    fee_growth_inside_0: u256,
    fee_growth_inside_1: u256,
) -> (Position, ModifyPositionResult) {
    assert(liquidity > 0, Errors::ZERO_LIQUIDITY);

    // Validate position parameters
    validate_position_params(tick_lower, tick_upper, tick_spacing);

    // Update position
    let liquidity_delta: i128 = liquidity.try_into().unwrap();
    position = update_position(position, liquidity_delta, fee_growth_inside_0, fee_growth_inside_1);

    // Calculate token amounts
    let sqrt_price_lower = get_sqrt_price_at_tick(tick_lower);
    let sqrt_price_upper = get_sqrt_price_at_tick(tick_upper);

    let (amount_0, amount_1) = get_amounts_for_liquidity(
        sqrt_price, sqrt_price_lower, sqrt_price_upper, liquidity_delta,
    );

    (position, ModifyPositionResult { amount_0, amount_1 })
}

/// Burn liquidity from a position
pub fn burn_position(
    mut position: Position,
    tick_lower: i32,
    tick_upper: i32,
    liquidity: u128,
    sqrt_price: u256,
    fee_growth_inside_0: u256,
    fee_growth_inside_1: u256,
) -> (Position, ModifyPositionResult) {
    assert(liquidity > 0, Errors::ZERO_LIQUIDITY);
    assert(position.liquidity >= liquidity, Errors::INSUFFICIENT_LIQUIDITY);

    // Update position
    let liquidity_delta: i128 = -(liquidity.try_into().unwrap());
    position = update_position(position, liquidity_delta, fee_growth_inside_0, fee_growth_inside_1);

    // Calculate token amounts to return
    let sqrt_price_lower = get_sqrt_price_at_tick(tick_lower);
    let sqrt_price_upper = get_sqrt_price_at_tick(tick_upper);

    let (amount_0, amount_1) = get_amounts_for_liquidity(
        sqrt_price, sqrt_price_lower, sqrt_price_upper, liquidity_delta,
    );

    (position, ModifyPositionResult { amount_0, amount_1 })
}

/// Collect fees from a position
pub fn collect_fees(
    mut position: Position, amount_0_requested: u128, amount_1_requested: u128,
) -> (Position, u128, u128) {
    let amount_0 = if amount_0_requested > position.tokens_owed_0 {
        position.tokens_owed_0
    } else {
        amount_0_requested
    };

    let amount_1 = if amount_1_requested > position.tokens_owed_1 {
        position.tokens_owed_1
    } else {
        amount_1_requested
    };

    position.tokens_owed_0 -= amount_0;
    position.tokens_owed_1 -= amount_1;

    (position, amount_0, amount_1)
}

#[cfg(test)]
mod tests {
    use super::{initialize_position, update_position, validate_position_params};

    #[test]
    fn test_initialize_position() {
        let position = initialize_position();

        assert(position.liquidity == 0, 'Liquidity should be 0');
        assert(position.tokens_owed_0 == 0, 'Tokens owed 0 should be 0');
        assert(position.tokens_owed_1 == 0, 'Tokens owed 1 should be 0');
    }

    #[test]
    fn test_update_position_add_liquidity() {
        let mut position = initialize_position();

        position = update_position(position, 1000, 0, 0);

        assert(position.liquidity == 1000, 'Should add liquidity');
    }

    #[test]
    fn test_update_position_remove_liquidity() {
        let mut position = initialize_position();
        position = update_position(position, 1000, 0, 0);

        position = update_position(position, -500, 0, 0);

        assert(position.liquidity == 500, 'Should remove liquidity');
    }

    #[test]
    fn test_validate_position_params() {
        validate_position_params(-100, 100, 10);
    }

    #[test]
    #[should_panic(expected: ('Tick lower >= upper',))]
    fn test_validate_position_params_invalid_range() {
        validate_position_params(100, -100, 10);
    }
}
