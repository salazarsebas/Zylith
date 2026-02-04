/// Custom types for Zylith

/// Signed 256-bit integer representation
/// Uses a bool flag for sign and u256 for magnitude
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct i256 {
    pub mag: u256,
    pub sign: bool // false = positive, true = negative
}

pub impl I256Impl of I256Trait {
    fn new(mag: u256, sign: bool) -> i256 {
        i256 { mag, sign }
    }

    fn from_u256(value: u256) -> i256 {
        i256 { mag: value, sign: false }
    }

    fn zero() -> i256 {
        i256 { mag: 0, sign: false }
    }

    fn is_zero(self: i256) -> bool {
        self.mag == 0
    }

    fn is_negative(self: i256) -> bool {
        self.sign && self.mag != 0
    }

    fn abs(self: i256) -> u256 {
        self.mag
    }
}

pub trait I256Trait {
    fn new(mag: u256, sign: bool) -> i256;
    fn from_u256(value: u256) -> i256;
    fn zero() -> i256;
    fn is_zero(self: i256) -> bool;
    fn is_negative(self: i256) -> bool;
    fn abs(self: i256) -> u256;
}
