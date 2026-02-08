/// Tick bitmap for efficiently storing initialized ticks
/// Uses a compressed bitmap to track which ticks have liquidity

/// Errors
pub mod Errors {
    pub const INVALID_POSITION: felt252 = 'Invalid tick position';
}

/// Get the position in the bitmap for a tick
/// Returns (word_pos, bit_pos) where word_pos is the u256 index and bit_pos is the bit within that
/// u256
pub fn position(tick: i32) -> (i32, u8) {
    // Floor division for word_pos (Cairo uses truncated division, so adjust for negatives)
    let word_pos = if tick < 0 && tick % 256 != 0 {
        (tick / 256) - 1
    } else {
        tick / 256
    };
    // bit_pos = tick - word_pos * 256, always in range [0, 255]
    let bit_pos: u8 = (tick - word_pos * 256).try_into().unwrap();
    (word_pos, bit_pos)
}

/// Flip the bit at the given tick
/// Returns the new word value
pub fn flip_bit(word: u256, bit_pos: u8) -> u256 {
    let mask: u256 = pow2(bit_pos);
    word ^ mask
}

/// Check if a tick is initialized
pub fn is_initialized(word: u256, bit_pos: u8) -> bool {
    let mask: u256 = pow2(bit_pos);
    (word & mask) != 0
}

/// Calculate 2^n for bit operations
fn pow2(n: u8) -> u256 {
    let mut result: u256 = 1;
    let mut i: u8 = 0;
    while i < n {
        result = result * 2;
        i += 1;
    }
    result
}

/// Find the next initialized tick to the right (greater than or equal to tick)
/// lte = true means we're searching for the next tick less than or equal
pub fn next_initialized_tick_within_one_word(word: u256, bit_pos: u8, lte: bool) -> (u8, bool) {
    if lte {
        // Search to the left (lower ticks)
        // Create mask for all bits at or below bit_pos
        let mask: u256 = if bit_pos == 255 {
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        } else {
            pow2(bit_pos + 1) - 1
        };

        let masked = word & mask;

        if masked == 0 {
            // No initialized tick in this word
            return (0, false);
        }

        // Find the most significant bit (rightmost initialized tick)
        let next_bit = most_significant_bit(masked);
        (next_bit, true)
    } else {
        // Search to the right (higher ticks)
        // Create mask for all bits above bit_pos
        let mask: u256 = if bit_pos == 0 {
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
        } else {
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff - (pow2(bit_pos) - 1)
        };

        let masked = word & mask;

        if masked == 0 {
            // No initialized tick in this word
            return (255, false);
        }

        // Find the least significant bit (leftmost initialized tick)
        let next_bit = least_significant_bit(masked);
        (next_bit, true)
    }
}

/// Find the least significant bit (rightmost 1 bit)
fn least_significant_bit(x: u256) -> u8 {
    assert(x > 0, 'Value must be positive');

    let mut r: u8 = 255;
    let mut remaining = x;

    if (remaining & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) > 0 {
        r -= 128;
    } else {
        remaining = remaining / 0x100000000000000000000000000000000;
    }

    if (remaining & 0xFFFFFFFFFFFFFFFF) > 0 {
        r -= 64;
    } else {
        remaining = remaining / 0x10000000000000000;
    }

    if (remaining & 0xFFFFFFFF) > 0 {
        r -= 32;
    } else {
        remaining = remaining / 0x100000000;
    }

    if (remaining & 0xFFFF) > 0 {
        r -= 16;
    } else {
        remaining = remaining / 0x10000;
    }

    if (remaining & 0xFF) > 0 {
        r -= 8;
    } else {
        remaining = remaining / 0x100;
    }

    if (remaining & 0xF) > 0 {
        r -= 4;
    } else {
        remaining = remaining / 0x10;
    }

    if (remaining & 0x3) > 0 {
        r -= 2;
    } else {
        remaining = remaining / 0x4;
    }

    if (remaining & 0x1) > 0 {
        r -= 1;
    }

    r
}

/// Find the most significant bit (leftmost 1 bit)
fn most_significant_bit(x: u256) -> u8 {
    assert(x > 0, 'Value must be positive');

    let mut r: u8 = 0;
    let mut remaining = x;

    if remaining >= 0x100000000000000000000000000000000 {
        remaining = remaining / 0x100000000000000000000000000000000;
        r += 128;
    }

    if remaining >= 0x10000000000000000 {
        remaining = remaining / 0x10000000000000000;
        r += 64;
    }

    if remaining >= 0x100000000 {
        remaining = remaining / 0x100000000;
        r += 32;
    }

    if remaining >= 0x10000 {
        remaining = remaining / 0x10000;
        r += 16;
    }

    if remaining >= 0x100 {
        remaining = remaining / 0x100;
        r += 8;
    }

    if remaining >= 0x10 {
        remaining = remaining / 0x10;
        r += 4;
    }

    if remaining >= 0x4 {
        remaining = remaining / 0x4;
        r += 2;
    }

    if remaining >= 0x2 {
        r += 1;
    }

    r
}

#[cfg(test)]
mod tests {
    use super::{flip_bit, is_initialized, least_significant_bit, most_significant_bit, position};

    #[test]
    fn test_position() {
        let (word_pos, bit_pos) = position(0);
        assert(word_pos == 0, 'Word pos should be 0');
        assert(bit_pos == 0, 'Bit pos should be 0');

        let (word_pos, bit_pos) = position(256);
        assert(word_pos == 1, 'Word pos should be 1');
        assert(bit_pos == 0, 'Bit pos should be 0');

        let (word_pos, bit_pos) = position(-256);
        assert(word_pos == -1, 'Word pos should be -1');
        assert(bit_pos == 0, 'Bit pos should be 0');
    }

    #[test]
    fn test_flip_bit() {
        let word = 0_u256;
        let new_word = flip_bit(word, 0);
        assert(new_word == 1, 'Should set bit 0');

        let new_word = flip_bit(new_word, 0);
        assert(new_word == 0, 'Should unset bit 0');
    }

    #[test]
    fn test_is_initialized() {
        let word = 1_u256; // Bit 0 is set
        assert(is_initialized(word, 0), 'Bit 0 should be set');
        assert(!is_initialized(word, 1), 'Bit 1 should not be set');
    }

    #[test]
    fn test_least_significant_bit() {
        assert(least_significant_bit(1) == 0, 'LSB of 1 is 0');
        assert(least_significant_bit(2) == 1, 'LSB of 2 is 1');
        assert(least_significant_bit(3) == 0, 'LSB of 3 is 0');
        assert(least_significant_bit(4) == 2, 'LSB of 4 is 2');
    }

    #[test]
    fn test_most_significant_bit() {
        assert(most_significant_bit(1) == 0, 'MSB of 1 is 0');
        assert(most_significant_bit(2) == 1, 'MSB of 2 is 1');
        assert(most_significant_bit(3) == 1, 'MSB of 3 is 1');
        assert(most_significant_bit(4) == 2, 'MSB of 4 is 2');
    }
}
