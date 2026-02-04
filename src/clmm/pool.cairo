use core::num::traits::Zero;
/// Pool state management for CLMM
use starknet::ContractAddress;
use super::fees::FeeTier;
use super::math::sqrt_price::validate_sqrt_price;
use super::math::tick_math::validate_tick;

/// Pool key uniquely identifies a pool
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct PoolKey {
    pub token_0: ContractAddress,
    pub token_1: ContractAddress,
    pub fee_tier: FeeTier,
}

/// Pool state
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct PoolState {
    pub sqrt_price: u256, // Current sqrt price (Q128.128)
    pub tick: i32, // Current tick
    pub liquidity: u128, // Active liquidity in current tick
    pub fee_growth_global_0: u256, // Global fee growth for token0 (Q128.128)
    pub fee_growth_global_1: u256, // Global fee growth for token1 (Q128.128)
    pub protocol_fees_0: u128, // Accumulated protocol fees for token0
    pub protocol_fees_1: u128 // Accumulated protocol fees for token1
}

/// Tick information
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct TickInfo {
    pub liquidity_gross: u128, // Total liquidity referencing this tick
    pub liquidity_net: i128, // Liquidity delta when crossing tick
    pub fee_growth_outside_0: u256, // Fee growth outside this tick for token0
    pub fee_growth_outside_1: u256, // Fee growth outside this tick for token1
    pub initialized: bool // Whether the tick is initialized
}

/// Slot0 cache for gas optimization
#[derive(Copy, Drop, Serde)]
pub struct Slot0 {
    pub sqrt_price: u256,
    pub tick: i32,
}

/// Errors
pub mod Errors {
    pub const POOL_ALREADY_INITIALIZED: felt252 = 'Pool already initialized';
    pub const POOL_NOT_INITIALIZED: felt252 = 'Pool not initialized';
    pub const INVALID_TOKEN_ORDER: felt252 = 'Invalid token order';
    pub const IDENTICAL_TOKENS: felt252 = 'Identical tokens';
    pub const ZERO_ADDRESS: felt252 = 'Zero address token';
    pub const INVALID_SQRT_PRICE: felt252 = 'Invalid sqrt price';
    pub const INVALID_TICK: felt252 = 'Invalid tick';
}

/// Validate pool key
pub fn validate_pool_key(pool_key: PoolKey) {
    // Check for zero addresses
    assert(!pool_key.token_0.is_zero() && !pool_key.token_1.is_zero(), Errors::ZERO_ADDRESS);

    // Check tokens are different
    assert(pool_key.token_0 != pool_key.token_1, Errors::IDENTICAL_TOKENS);
}

/// Create a new pool key with correct token ordering
pub fn create_pool_key(
    token_a: ContractAddress, token_b: ContractAddress, fee_tier: FeeTier,
) -> PoolKey {
    assert(!token_a.is_zero() && !token_b.is_zero(), Errors::ZERO_ADDRESS);
    assert(token_a != token_b, Errors::IDENTICAL_TOKENS);

    // Order tokens - convert to felt252 then u256 for comparison
    let token_a_felt: felt252 = token_a.into();
    let token_b_felt: felt252 = token_b.into();
    let token_a_u256: u256 = token_a_felt.into();
    let token_b_u256: u256 = token_b_felt.into();

    let (token_0, token_1) = if token_a_u256 < token_b_u256 {
        (token_a, token_b)
    } else {
        (token_b, token_a)
    };

    PoolKey { token_0, token_1, fee_tier }
}

/// Initialize pool state
pub fn initialize_pool_state(sqrt_price: u256, tick: i32) -> PoolState {
    validate_sqrt_price(sqrt_price);
    validate_tick(tick);

    PoolState {
        sqrt_price,
        tick,
        liquidity: 0,
        fee_growth_global_0: 0,
        fee_growth_global_1: 0,
        protocol_fees_0: 0,
        protocol_fees_1: 0,
    }
}

/// Initialize tick info
pub fn initialize_tick_info() -> TickInfo {
    TickInfo {
        liquidity_gross: 0,
        liquidity_net: 0,
        fee_growth_outside_0: 0,
        fee_growth_outside_1: 0,
        initialized: false,
    }
}

/// Update tick on liquidity change
pub fn update_tick(
    mut tick_info: TickInfo,
    liquidity_delta: i128,
    tick: i32,
    tick_current: i32,
    fee_growth_global_0: u256,
    fee_growth_global_1: u256,
    upper: bool,
) -> TickInfo {
    let liquidity_gross_before = tick_info.liquidity_gross;

    // Update gross liquidity
    let liquidity_gross_after = if liquidity_delta < 0 {
        let delta_abs: u128 = (liquidity_delta * -1).try_into().unwrap();
        assert(liquidity_gross_before >= delta_abs, 'Insufficient liquidity');
        liquidity_gross_before - delta_abs
    } else {
        let delta_abs: u128 = liquidity_delta.try_into().unwrap();
        liquidity_gross_before + delta_abs
    };

    tick_info.liquidity_gross = liquidity_gross_after;

    // Update net liquidity
    tick_info.liquidity_net = tick_info.liquidity_net + liquidity_delta;

    // Initialize fee growth outside if this is the first liquidity
    if liquidity_gross_before == 0 && liquidity_gross_after > 0 {
        tick_info.initialized = true;

        // Set fee growth outside based on current tick
        if tick <= tick_current {
            tick_info.fee_growth_outside_0 = fee_growth_global_0;
            tick_info.fee_growth_outside_1 = fee_growth_global_1;
        }
    }

    // Clear tick if no more liquidity
    if liquidity_gross_after == 0 {
        tick_info = initialize_tick_info();
    }

    tick_info
}

/// Cross a tick (update state when price moves through a tick)
pub fn cross_tick(
    mut tick_info: TickInfo, fee_growth_global_0: u256, fee_growth_global_1: u256,
) -> (TickInfo, i128) {
    // Update fee growth outside
    tick_info.fee_growth_outside_0 = fee_growth_global_0 - tick_info.fee_growth_outside_0;
    tick_info.fee_growth_outside_1 = fee_growth_global_1 - tick_info.fee_growth_outside_1;

    (tick_info, tick_info.liquidity_net)
}

#[cfg(test)]
mod tests {
    use starknet::contract_address_const;
    use super::super::fees::StandardFeeTiers;
    use super::{create_pool_key, initialize_pool_state, initialize_tick_info, update_tick};

    #[test]
    fn test_create_pool_key() {
        let token_a = contract_address_const::<0x2>();
        let token_b = contract_address_const::<0x1>();
        let fee_tier = StandardFeeTiers::fee_tier_30();

        let pool_key = create_pool_key(token_a, token_b, fee_tier);

        // Should order tokens correctly
        assert(pool_key.token_0 == token_b, 'Token 0 should be smaller');
        assert(pool_key.token_1 == token_a, 'Token 1 should be larger');
    }

    #[test]
    fn test_initialize_pool_state() {
        let sqrt_price = 0x100000000000000000000000000000000; // ONE
        let tick = 0;

        let state = initialize_pool_state(sqrt_price, tick);

        assert(state.sqrt_price == sqrt_price, 'Invalid sqrt price');
        assert(state.tick == tick, 'Invalid tick');
        assert(state.liquidity == 0, 'Liquidity should be 0');
    }

    #[test]
    fn test_initialize_tick_info() {
        let tick_info = initialize_tick_info();

        assert(tick_info.liquidity_gross == 0, 'Gross should be 0');
        assert(tick_info.liquidity_net == 0, 'Net should be 0');
        assert(!tick_info.initialized, 'Should not be initialized');
    }

    #[test]
    fn test_update_tick() {
        let mut tick_info = initialize_tick_info();

        tick_info = update_tick(tick_info, 1000, 100, 0, 0, 0, false);

        assert(tick_info.liquidity_gross == 1000, 'Should add liquidity');
        assert(tick_info.liquidity_net == 1000, 'Net should match');
        assert(tick_info.initialized, 'Should be initialized');
    }
}
