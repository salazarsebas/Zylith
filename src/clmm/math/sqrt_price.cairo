use core::integer::u512_safe_div_rem_by_u256;
/// Fixed-point math for Q128.128 sqrt prices
/// Implements square root price calculations used in CLMM
use core::num::traits::WideMul;

/// Q128.128 fixed point constant: ONE = 2^128
pub const ONE: u256 = 0x100000000000000000000000000000000;

/// Minimum sqrt price (tick = -887272) in Q128.128
pub const MIN_SQRT_PRICE: u256 = 0x1000276A300000000;

/// Maximum sqrt price (tick = 887272) in Q128.128
pub const MAX_SQRT_PRICE: u256 = 0xFFFD8963EFD1FC6A506488495D951D5263988D2600000000;

/// Errors
pub mod Errors {
    pub const INVALID_SQRT_PRICE: felt252 = 'Invalid sqrt price';
    pub const SQRT_PRICE_OUT_OF_BOUNDS: felt252 = 'Sqrt price out of bounds';
    pub const DIVISION_BY_ZERO: felt252 = 'Division by zero';
    pub const OVERFLOW: felt252 = 'Arithmetic overflow';
}

/// Multiply two Q128.128 numbers
/// Result = (a * b) / 2^128
pub fn mul_q128(a: u256, b: u256) -> u256 {
    let product = a.wide_mul(b);
    let (quotient, _) = u512_safe_div_rem_by_u256(product, ONE.try_into().unwrap());
    quotient.try_into().expect(Errors::OVERFLOW)
}

/// Divide two Q128.128 numbers
/// Result = (a * 2^128) / b
pub fn div_q128(a: u256, b: u256) -> u256 {
    assert(b != 0, Errors::DIVISION_BY_ZERO);
    let numerator = a.wide_mul(ONE);
    let (quotient, _) = u512_safe_div_rem_by_u256(numerator, b.try_into().unwrap());
    quotient.try_into().expect(Errors::OVERFLOW)
}

/// Multiply a u256 by a Q128.128 number and get the floor
pub fn mul_div_floor(a: u256, b_q128: u256, divisor: u256) -> u256 {
    assert(divisor != 0, Errors::DIVISION_BY_ZERO);
    let product = a.wide_mul(b_q128);
    let (quotient, _) = u512_safe_div_rem_by_u256(product, divisor.try_into().unwrap());
    let result: u256 = quotient.try_into().expect(Errors::OVERFLOW);
    result / ONE
}

/// Multiply a u256 by a Q128.128 number and get the ceiling
pub fn mul_div_ceil(a: u256, b_q128: u256, divisor: u256) -> u256 {
    assert(divisor != 0, Errors::DIVISION_BY_ZERO);
    let product = a.wide_mul(b_q128);
    let (quotient, remainder) = u512_safe_div_rem_by_u256(product, divisor.try_into().unwrap());
    let mut result: u256 = quotient.try_into().expect(Errors::OVERFLOW);
    result = result / ONE;

    if remainder != 0 {
        result += 1;
    }
    result
}

/// Wide multiply and divide: floor(a * b / c) using u512 arithmetic
pub fn wide_mul_div(a: u256, b: u256, c: u256) -> u256 {
    assert(c != 0, Errors::DIVISION_BY_ZERO);
    let product = a.wide_mul(b);
    let (quotient, _) = u512_safe_div_rem_by_u256(product, c.try_into().unwrap());
    quotient.try_into().expect(Errors::OVERFLOW)
}

/// Wide multiply and divide with ceiling: ceil(a * b / c) using u512 arithmetic
pub fn wide_mul_div_ceil(a: u256, b: u256, c: u256) -> u256 {
    assert(c != 0, Errors::DIVISION_BY_ZERO);
    let product = a.wide_mul(b);
    let (quotient, remainder) = u512_safe_div_rem_by_u256(product, c.try_into().unwrap());
    let mut result: u256 = quotient.try_into().expect(Errors::OVERFLOW);
    if remainder != 0 {
        result += 1;
    }
    result
}

/// Get the next sqrt price from input amount
/// Moving left (token0 in) decreases sqrt_price
/// Moving right (token1 in) increases sqrt_price
pub fn get_next_sqrt_price_from_input(
    sqrt_price: u256, liquidity: u128, amount_in: u256, zero_for_one: bool,
) -> u256 {
    assert(sqrt_price > 0, Errors::INVALID_SQRT_PRICE);
    assert(liquidity > 0, 'Liquidity must be positive');

    if zero_for_one {
        get_next_sqrt_price_from_amount_0_rounding_up(sqrt_price, liquidity, amount_in, true)
    } else {
        get_next_sqrt_price_from_amount_1_rounding_down(sqrt_price, liquidity, amount_in, true)
    }
}

/// Get the next sqrt price from output amount
pub fn get_next_sqrt_price_from_output(
    sqrt_price: u256, liquidity: u128, amount_out: u256, zero_for_one: bool,
) -> u256 {
    assert(sqrt_price > 0, Errors::INVALID_SQRT_PRICE);
    assert(liquidity > 0, 'Liquidity must be positive');

    if zero_for_one {
        get_next_sqrt_price_from_amount_1_rounding_down(sqrt_price, liquidity, amount_out, false)
    } else {
        get_next_sqrt_price_from_amount_0_rounding_up(sqrt_price, liquidity, amount_out, false)
    }
}

/// Calculate next sqrt price from amount0
/// new_p = L * p * ONE / (L * ONE +/- amount * p) = numerator * sqrt_price / denominator
/// Round up to favor the pool
fn get_next_sqrt_price_from_amount_0_rounding_up(
    sqrt_price: u256, liquidity: u128, amount: u256, add: bool,
) -> u256 {
    if amount == 0 {
        return sqrt_price;
    }

    let liquidity_u256: u256 = liquidity.into();
    let numerator = liquidity_u256 * ONE;

    if add {
        // Price decreases when adding token0
        let product = amount * sqrt_price;
        let denominator = numerator + product;

        if denominator >= numerator {
            let result = wide_mul_div_ceil(numerator, sqrt_price, denominator);
            assert(
                result >= MIN_SQRT_PRICE && result <= MAX_SQRT_PRICE,
                Errors::SQRT_PRICE_OUT_OF_BOUNDS,
            );
            return result;
        }

        // Overflow fallback: new_p = ceil(numerator / (numerator / p + amount))
        let denom = (numerator / sqrt_price) + amount;
        let result = if numerator % denom != 0 {
            (numerator / denom) + 1
        } else {
            numerator / denom
        };
        assert(
            result >= MIN_SQRT_PRICE && result <= MAX_SQRT_PRICE, Errors::SQRT_PRICE_OUT_OF_BOUNDS,
        );
        result
    } else {
        // Price increases when removing token0
        let product = amount * sqrt_price;
        assert(numerator > product, 'Amount exceeds liquidity');

        let denominator = numerator - product;
        let result = wide_mul_div_ceil(numerator, sqrt_price, denominator);
        assert(
            result >= MIN_SQRT_PRICE && result <= MAX_SQRT_PRICE, Errors::SQRT_PRICE_OUT_OF_BOUNDS,
        );
        result
    }
}

/// Calculate next sqrt price from amount1
/// Round down to favor the pool
fn get_next_sqrt_price_from_amount_1_rounding_down(
    sqrt_price: u256, liquidity: u128, amount: u256, add: bool,
) -> u256 {
    if amount == 0 {
        return sqrt_price;
    }

    let liquidity_u256: u256 = liquidity.into();

    if add {
        // Price increases when adding token1
        let quotient = if amount <= 0xffffffffffffffffffffffffffffffff {
            (amount * ONE) / liquidity_u256
        } else {
            mul_q128(amount, div_q128(ONE, liquidity_u256))
        };

        let result = sqrt_price + quotient;
        assert(
            result >= MIN_SQRT_PRICE && result <= MAX_SQRT_PRICE, Errors::SQRT_PRICE_OUT_OF_BOUNDS,
        );
        result
    } else {
        // Price decreases when removing token1
        // quotient = ceil(amount * ONE / L) — Q128.128 representation of amount/L
        let quotient = if amount <= 0xffffffffffffffffffffffffffffffff {
            wide_mul_div_ceil(amount, ONE, liquidity_u256)
        } else {
            mul_q128(amount, div_q128(ONE, liquidity_u256))
        };

        assert(sqrt_price > quotient, 'Amount exceeds liquidity');
        let result = sqrt_price - quotient;
        assert(
            result >= MIN_SQRT_PRICE && result <= MAX_SQRT_PRICE, Errors::SQRT_PRICE_OUT_OF_BOUNDS,
        );
        result
    }
}

/// Validate sqrt price is in valid range
pub fn validate_sqrt_price(sqrt_price: u256) {
    assert(
        sqrt_price >= MIN_SQRT_PRICE && sqrt_price <= MAX_SQRT_PRICE,
        Errors::SQRT_PRICE_OUT_OF_BOUNDS,
    );
}

#[cfg(test)]
mod tests {
    use super::{ONE, div_q128, mul_q128};

    #[test]
    fn test_mul_q128() {
        // 1 * 1 = 1
        let result = mul_q128(ONE, ONE);
        assert(result == ONE, 'Should equal ONE');

        // 2 * 3 = 6
        let result = mul_q128(2 * ONE, 3 * ONE);
        assert(result == 6 * ONE, 'Should equal 6');
    }

    #[test]
    fn test_div_q128() {
        // 6 / 2 = 3
        let result = div_q128(6 * ONE, 2 * ONE);
        assert(result == 3 * ONE, 'Should equal 3');
    }
}
