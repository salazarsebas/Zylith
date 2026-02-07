/// Liquidity math for CLMM
/// Calculates token amounts from liquidity and price ranges
use core::integer::u512_safe_div_rem_by_u256;
use core::num::traits::WideMul;
use super::sqrt_price::{ONE, mul_div_ceil, mul_div_floor, mul_q128};

/// Errors
pub mod Errors {
    pub const INVALID_LIQUIDITY: felt252 = 'Invalid liquidity';
    pub const INVALID_PRICE_RANGE: felt252 = 'Invalid price range';
    pub const DIVISION_BY_ZERO: felt252 = 'Division by zero';
}

/// Calculate amount0 delta from liquidity and price range
/// amount0 = liquidity * (sqrt_price_b - sqrt_price_a) / (sqrt_price_a * sqrt_price_b)
/// When round_up is true, we round up to favor the pool
pub fn get_amount_0_delta(
    sqrt_price_a: u256, sqrt_price_b: u256, liquidity: u128, round_up: bool,
) -> u256 {
    let (sqrt_price_lower, sqrt_price_upper) = if sqrt_price_a < sqrt_price_b {
        (sqrt_price_a, sqrt_price_b)
    } else {
        (sqrt_price_b, sqrt_price_a)
    };

    assert(sqrt_price_upper > sqrt_price_lower, Errors::INVALID_PRICE_RANGE);
    assert(sqrt_price_lower > 0, Errors::DIVISION_BY_ZERO);

    let liquidity_u256: u256 = liquidity.into();
    let numerator = liquidity_u256 * (sqrt_price_upper - sqrt_price_lower);

    if round_up {
        // Round up: use ceiling division
        let denominator = mul_q128(sqrt_price_lower, sqrt_price_upper);
        mul_div_ceil(numerator, ONE, denominator)
    } else {
        // Round down: use floor division
        let denominator = mul_q128(sqrt_price_lower, sqrt_price_upper);
        mul_div_floor(numerator, ONE, denominator)
    }
}

/// Calculate amount1 delta from liquidity and price range
/// amount1 = liquidity * (sqrt_price_b - sqrt_price_a)
/// When round_up is true, we round up to favor the pool
pub fn get_amount_1_delta(
    sqrt_price_a: u256, sqrt_price_b: u256, liquidity: u128, round_up: bool,
) -> u256 {
    let (sqrt_price_lower, sqrt_price_upper) = if sqrt_price_a < sqrt_price_b {
        (sqrt_price_a, sqrt_price_b)
    } else {
        (sqrt_price_b, sqrt_price_a)
    };

    assert(sqrt_price_upper >= sqrt_price_lower, Errors::INVALID_PRICE_RANGE);

    let liquidity_u256: u256 = liquidity.into();
    let delta = sqrt_price_upper - sqrt_price_lower;

    if round_up {
        // Round up
        let product = liquidity_u256 * delta;
        let result = product / ONE;
        if (product % ONE) > 0 {
            result + 1
        } else {
            result
        }
    } else {
        // Round down
        (liquidity_u256 * delta) / ONE
    }
}

/// Calculate liquidity from amount0 and price range
/// liquidity = amount0 * (sqrt_price_a * sqrt_price_b) / (sqrt_price_b - sqrt_price_a)
pub fn get_liquidity_for_amount_0(sqrt_price_a: u256, sqrt_price_b: u256, amount_0: u256) -> u128 {
    let (sqrt_price_lower, sqrt_price_upper) = if sqrt_price_a < sqrt_price_b {
        (sqrt_price_a, sqrt_price_b)
    } else {
        (sqrt_price_b, sqrt_price_a)
    };

    assert(sqrt_price_upper > sqrt_price_lower, Errors::INVALID_PRICE_RANGE);

    // Compute: liquidity = amount0 * sqrt_price_lower * sqrt_price_upper / (sqrt_price_upper -
    // sqrt_price_lower)
    // Rewrite to avoid overflow: liquidity = amount0 * sqrt_price_lower / (sqrt_price_upper -
    // sqrt_price_lower) * sqrt_price_upper / ONE
    let delta = sqrt_price_upper - sqrt_price_lower;
    assert(delta > 0, Errors::DIVISION_BY_ZERO);

    // Step 1: (amount0 * sqrt_price_lower * sqrt_price_upper) / delta / ONE
    // Using u512 arithmetic via wide_mul to handle the multiplication
    let numerator1 = amount_0.wide_mul(sqrt_price_lower);
    let (quotient1, _) = u512_safe_div_rem_by_u256(numerator1, delta.try_into().unwrap());
    let temp: u256 = quotient1.try_into().expect('Intermediate overflow');

    // Step 2: multiply by sqrt_price_upper and divide by ONE
    let numerator2 = temp.wide_mul(sqrt_price_upper);
    let (quotient2, _) = u512_safe_div_rem_by_u256(numerator2, ONE.try_into().unwrap());
    let liquidity: u256 = quotient2.try_into().expect('Liquidity overflow');

    liquidity.try_into().expect('Liquidity exceeds u128')
}

/// Calculate liquidity from amount1 and price range
/// liquidity = amount1 / (sqrt_price_b - sqrt_price_a)
pub fn get_liquidity_for_amount_1(sqrt_price_a: u256, sqrt_price_b: u256, amount_1: u256) -> u128 {
    let (sqrt_price_lower, sqrt_price_upper) = if sqrt_price_a < sqrt_price_b {
        (sqrt_price_a, sqrt_price_b)
    } else {
        (sqrt_price_b, sqrt_price_a)
    };

    assert(sqrt_price_upper > sqrt_price_lower, Errors::INVALID_PRICE_RANGE);

    let delta = sqrt_price_upper - sqrt_price_lower;
    let liquidity = (amount_1 * ONE) / delta;
    liquidity.try_into().expect('Liquidity overflow')
}

/// Calculate liquidity from both amounts
/// Returns the minimum liquidity that can be provided given both amounts
pub fn get_liquidity_for_amounts(
    sqrt_price: u256, sqrt_price_a: u256, sqrt_price_b: u256, amount_0: u256, amount_1: u256,
) -> u128 {
    let (sqrt_price_lower, sqrt_price_upper) = if sqrt_price_a < sqrt_price_b {
        (sqrt_price_a, sqrt_price_b)
    } else {
        (sqrt_price_b, sqrt_price_a)
    };

    assert(sqrt_price_upper > sqrt_price_lower, Errors::INVALID_PRICE_RANGE);

    if sqrt_price <= sqrt_price_lower {
        // Current price below range - only need token0
        get_liquidity_for_amount_0(sqrt_price_lower, sqrt_price_upper, amount_0)
    } else if sqrt_price < sqrt_price_upper {
        // Current price in range - need both tokens
        let liquidity_0 = get_liquidity_for_amount_0(sqrt_price, sqrt_price_upper, amount_0);
        let liquidity_1 = get_liquidity_for_amount_1(sqrt_price_lower, sqrt_price, amount_1);

        // Return minimum of the two
        if liquidity_0 < liquidity_1 {
            liquidity_0
        } else {
            liquidity_1
        }
    } else {
        // Current price above range - only need token1
        get_liquidity_for_amount_1(sqrt_price_lower, sqrt_price_upper, amount_1)
    }
}

/// Add liquidity (returns new liquidity, capped at u128::MAX)
pub fn add_liquidity(liquidity: u128, delta: u128) -> u128 {
    let result: u256 = liquidity.into() + delta.into();
    if result > 0xffffffffffffffffffffffffffffffff {
        0xffffffffffffffffffffffffffffffff_u128
    } else {
        result.try_into().unwrap()
    }
}

/// Subtract liquidity (panics on underflow)
pub fn sub_liquidity(liquidity: u128, delta: u128) -> u128 {
    assert(liquidity >= delta, 'Liquidity underflow');
    liquidity - delta
}

#[cfg(test)]
mod tests {
    use super::super::sqrt_price::ONE;
    use super::{
        get_amount_0_delta, get_amount_1_delta, get_liquidity_for_amount_0,
        get_liquidity_for_amount_1,
    };

    #[test]
    fn test_get_amount_0_delta() {
        let sqrt_price_a = ONE; // price = 1
        let sqrt_price_b = 2 * ONE; // price = 4
        let liquidity = 1000000_u128;

        let amount = get_amount_0_delta(sqrt_price_a, sqrt_price_b, liquidity, false);
        assert(amount > 0, 'Amount should be positive');
    }

    #[test]
    fn test_get_amount_1_delta() {
        let sqrt_price_a = ONE;
        let sqrt_price_b = 2 * ONE;
        let liquidity = 1000000_u128;

        let amount = get_amount_1_delta(sqrt_price_a, sqrt_price_b, liquidity, false);
        assert(amount > 0, 'Amount should be positive');
    }

    #[test]
    fn test_get_liquidity_for_amount_0() {
        let sqrt_price_a = ONE;
        let sqrt_price_b = 2 * ONE;
        let amount_0 = 1000000;

        let liquidity = get_liquidity_for_amount_0(sqrt_price_a, sqrt_price_b, amount_0);
        assert(liquidity > 0, 'Liquidity should be positive');
    }

    #[test]
    fn test_get_liquidity_for_amount_1() {
        let sqrt_price_a = ONE;
        let sqrt_price_b = 2 * ONE;
        let amount_1 = 1000000;

        let liquidity = get_liquidity_for_amount_1(sqrt_price_a, sqrt_price_b, amount_1);
        assert(liquidity > 0, 'Liquidity should be positive');
    }
}
