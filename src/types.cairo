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

/// Ekubo-style tick representation for wallet-safe calldata serialization.
/// Starknet wallets (Argent) and explorers (Voyager) cannot properly handle
/// i32 serialization as felt252 for negative values. This struct uses only
/// wallet-friendly types: bool and u32.
#[derive(Copy, Drop, Serde, starknet::Store, PartialEq, Hash)]
pub struct Tick {
    pub sign: bool, // false = non-negative, true = negative
    pub mag: u32, // absolute value
}

pub trait TickTrait {
    fn new(sign: bool, mag: u32) -> Tick;
    fn from_i32(value: i32) -> Tick;
    fn to_i32(self: Tick) -> i32;
}

pub impl TickImpl of TickTrait {
    fn new(sign: bool, mag: u32) -> Tick {
        Tick { sign: if mag == 0 { false } else { sign }, mag }
    }

    fn from_i32(value: i32) -> Tick {
        if value < 0 {
            Tick { sign: true, mag: (value * -1).try_into().unwrap() }
        } else {
            Tick { sign: false, mag: value.try_into().unwrap() }
        }
    }

    fn to_i32(self: Tick) -> i32 {
        let mag_i32: i32 = self.mag.try_into().unwrap();
        if self.sign {
            -mag_i32
        } else {
            mag_i32
        }
    }
}
