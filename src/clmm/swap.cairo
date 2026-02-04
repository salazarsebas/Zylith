use super::fees::{calculate_fee_amount, calculate_protocol_fee, update_fee_growth};
use super::math::liquidity::{add_liquidity, get_amount_0_delta, get_amount_1_delta, sub_liquidity};
use super::math::sqrt_price::{get_next_sqrt_price_from_input, get_next_sqrt_price_from_output};
use super::math::tick_math::{MAX_TICK, MIN_TICK, align_tick_down, align_tick_up};
use super::pool::PoolState;
use super::tick_bitmap::{next_initialized_tick_within_one_word, position};
/// Swap engine for CLMM
/// Implements the core swap logic with tick crossing
use super::super::types::i256;

/// Swap state tracked during execution
#[derive(Copy, Drop, Serde)]
pub struct SwapState {
    pub amount_specified_remaining: u256,
    pub amount_calculated: u256,
    pub sqrt_price: u256,
    pub tick: i32,
    pub liquidity: u128,
}

/// Step state for each iteration
#[derive(Copy, Drop, Serde)]
pub struct StepState {
    pub sqrt_price_start: u256,
    pub tick_next: i32,
    pub initialized: bool,
    pub sqrt_price_next: u256,
    pub amount_in: u256,
    pub amount_out: u256,
    pub fee_amount: u256,
}

/// Swap result
#[derive(Copy, Drop, Serde)]
pub struct SwapResult {
    pub amount_0: i256,
    pub amount_1: i256,
    pub sqrt_price: u256,
    pub liquidity: u128,
    pub tick: i32,
}

/// Errors
pub mod Errors {
    pub const INVALID_AMOUNT: felt252 = 'Invalid amount';
    pub const INSUFFICIENT_LIQUIDITY: felt252 = 'Insufficient liquidity';
    pub const PRICE_LIMIT_EXCEEDED: felt252 = 'Price limit exceeded';
    pub const ZERO_LIQUIDITY: felt252 = 'Zero liquidity';
}

/// Execute a single swap step
pub fn compute_swap_step(
    sqrt_price_current: u256,
    sqrt_price_target: u256,
    liquidity: u128,
    amount_remaining: u256,
    fee: u32,
    zero_for_one: bool,
) -> (u256, u256, u256, u256) {
    assert(liquidity > 0, Errors::ZERO_LIQUIDITY);

    let exact_input = amount_remaining > 0;

    // Determine if we can reach the target price
    let sqrt_price_next = if exact_input {
        // For exact input, try to reach target with remaining amount
        let sqrt_price_max = get_next_sqrt_price_from_input(
            sqrt_price_current, liquidity, amount_remaining, zero_for_one,
        );

        if zero_for_one {
            if sqrt_price_max < sqrt_price_target {
                sqrt_price_target
            } else {
                sqrt_price_max
            }
        } else {
            if sqrt_price_max > sqrt_price_target {
                sqrt_price_target
            } else {
                sqrt_price_max
            }
        }
    } else {
        // For exact output, try to reach target with remaining amount
        let sqrt_price_max = get_next_sqrt_price_from_output(
            sqrt_price_current, liquidity, amount_remaining, zero_for_one,
        );

        if zero_for_one {
            if sqrt_price_max < sqrt_price_target {
                sqrt_price_target
            } else {
                sqrt_price_max
            }
        } else {
            if sqrt_price_max > sqrt_price_target {
                sqrt_price_target
            } else {
                sqrt_price_max
            }
        }
    };

    let reached_target = sqrt_price_next == sqrt_price_target;

    // Calculate amounts
    let (amount_in, amount_out) = if zero_for_one {
        (
            if reached_target && !exact_input {
                get_amount_0_delta(sqrt_price_target, sqrt_price_current, liquidity, true)
            } else {
                get_amount_0_delta(sqrt_price_next, sqrt_price_current, liquidity, true)
            },
            if reached_target && exact_input {
                get_amount_1_delta(sqrt_price_target, sqrt_price_current, liquidity, false)
            } else {
                get_amount_1_delta(sqrt_price_next, sqrt_price_current, liquidity, false)
            },
        )
    } else {
        (
            if reached_target && !exact_input {
                get_amount_1_delta(sqrt_price_current, sqrt_price_target, liquidity, true)
            } else {
                get_amount_1_delta(sqrt_price_current, sqrt_price_next, liquidity, true)
            },
            if reached_target && exact_input {
                get_amount_0_delta(sqrt_price_current, sqrt_price_target, liquidity, false)
            } else {
                get_amount_0_delta(sqrt_price_current, sqrt_price_next, liquidity, false)
            },
        )
    };

    // Calculate fee
    let fee_amount = if exact_input && !reached_target {
        amount_remaining - amount_in
    } else {
        calculate_fee_amount(amount_in, fee)
    };

    (sqrt_price_next, amount_in, amount_out, fee_amount)
}

/// Get next initialized tick
pub fn get_next_tick(
    tick: i32, tick_spacing: u32, zero_for_one: bool, tick_bitmap_word: u256,
) -> (i32, bool) {
    let compressed = if zero_for_one {
        // Moving down (selling token0)
        align_tick_down(tick - 1, tick_spacing)
    } else {
        // Moving up (buying token0)
        align_tick_up(tick, tick_spacing)
    };

    let (_word_pos, bit_pos) = position(compressed / tick_spacing.try_into().unwrap());

    // Search in the current word
    let (next_bit, initialized) = next_initialized_tick_within_one_word(
        tick_bitmap_word, bit_pos, zero_for_one,
    );

    if initialized {
        let tick_spacing_i32: i32 = tick_spacing.try_into().unwrap();
        let next_tick = (compressed / tick_spacing_i32
            + if zero_for_one {
                -(next_bit.into())
            } else {
                next_bit.into()
            })
            * tick_spacing_i32;
        (next_tick, true)
    } else {
        // No tick found in this word
        if zero_for_one {
            (MIN_TICK, false)
        } else {
            (MAX_TICK, false)
        }
    }
}

/// Apply tick crossing to pool state
pub fn apply_tick_crossing(
    mut pool_state: PoolState, tick: i32, liquidity_net: i128, zero_for_one: bool,
) -> PoolState {
    // Update liquidity
    if zero_for_one {
        // Moving down - subtract liquidity net
        if liquidity_net < 0 {
            let liquidity_delta: u128 = (liquidity_net * -1).try_into().unwrap();
            pool_state.liquidity = add_liquidity(pool_state.liquidity, liquidity_delta);
        } else {
            let liquidity_delta: u128 = liquidity_net.try_into().unwrap();
            pool_state.liquidity = sub_liquidity(pool_state.liquidity, liquidity_delta);
        }
    } else {
        // Moving up - add liquidity net
        if liquidity_net < 0 {
            let liquidity_delta: u128 = (liquidity_net * -1).try_into().unwrap();
            pool_state.liquidity = sub_liquidity(pool_state.liquidity, liquidity_delta);
        } else {
            let liquidity_delta: u128 = liquidity_net.try_into().unwrap();
            pool_state.liquidity = add_liquidity(pool_state.liquidity, liquidity_delta);
        }
    }

    pool_state.tick = tick;
    pool_state
}

/// Update pool state with swap fees
pub fn update_pool_fees(
    mut pool_state: PoolState, fee_amount: u256, protocol_fee: u8, zero_for_one: bool,
) -> PoolState {
    // Calculate protocol fee portion
    let protocol_fee_amount = calculate_protocol_fee(fee_amount, protocol_fee);
    let lp_fee_amount = fee_amount - protocol_fee_amount;

    // Update protocol fees
    if zero_for_one {
        pool_state
            .protocol_fees_0 += protocol_fee_amount
            .try_into()
            .expect('Protocol fee overflow');
        pool_state
            .fee_growth_global_0 =
                update_fee_growth(
                    pool_state.fee_growth_global_0, lp_fee_amount, pool_state.liquidity,
                );
    } else {
        pool_state
            .protocol_fees_1 += protocol_fee_amount
            .try_into()
            .expect('Protocol fee overflow');
        pool_state
            .fee_growth_global_1 =
                update_fee_growth(
                    pool_state.fee_growth_global_1, lp_fee_amount, pool_state.liquidity,
                );
    }

    pool_state
}

#[cfg(test)]
mod tests {
    use super::compute_swap_step;
    use super::super::math::sqrt_price::ONE;

    #[test]
    fn test_compute_swap_step() {
        let sqrt_price_current = ONE;
        let sqrt_price_target = 2 * ONE;
        let liquidity = 1000000_u128;
        let amount_remaining = 1000;
        let fee = 3000; // 0.30%

        let (sqrt_price_next, amount_in, amount_out, fee_amount) = compute_swap_step(
            sqrt_price_current, sqrt_price_target, liquidity, amount_remaining, fee, false,
        );

        assert(sqrt_price_next > sqrt_price_current, 'Price should increase');
        assert(amount_in > 0, 'Amount in should be positive');
        assert(amount_out > 0, 'Amount out should be positive');
        assert(fee_amount > 0, 'Fee should be positive');
    }
}
