use starknet::ContractAddress;
use super::super::clmm::pool::{PoolKey, PoolState};
use super::super::clmm::positions::Position;
use super::super::types::i256;

/// Main pool interface for Zylith CLMM
#[starknet::interface]
pub trait IZylithPool<TContractState> {
    /// Initialize a new pool with a starting sqrt price
    fn initialize(ref self: TContractState, pool_key: PoolKey, sqrt_price: u256) -> PoolState;

    /// Get pool state
    fn get_pool_state(self: @TContractState, pool_key: PoolKey) -> PoolState;

    /// Mint a new liquidity position
    /// Returns (amount_0, amount_1) required
    fn mint(
        ref self: TContractState,
        pool_key: PoolKey,
        tick_lower: i32,
        tick_upper: i32,
        amount: u128,
        recipient: ContractAddress,
    ) -> (u256, u256);

    /// Burn liquidity from a position
    /// Returns (amount_0, amount_1) returned
    fn burn(
        ref self: TContractState, pool_key: PoolKey, tick_lower: i32, tick_upper: i32, amount: u128,
    ) -> (u256, u256);

    /// Collect fees from a position
    /// Returns (amount_0, amount_1) collected
    fn collect(
        ref self: TContractState,
        pool_key: PoolKey,
        tick_lower: i32,
        tick_upper: i32,
        amount_0_requested: u128,
        amount_1_requested: u128,
        recipient: ContractAddress,
    ) -> (u128, u128);

    /// Execute a swap
    /// amount_specified: amount to swap (negative for exact output)
    /// sqrt_price_limit: price limit for the swap
    /// Returns (amount_0, amount_1) where negative means paid, positive means received
    fn swap(
        ref self: TContractState,
        pool_key: PoolKey,
        zero_for_one: bool,
        amount_specified: i256,
        sqrt_price_limit: u256,
        recipient: ContractAddress,
    ) -> (i256, i256);

    /// Get position information
    fn get_position(
        self: @TContractState,
        pool_key: PoolKey,
        owner: ContractAddress,
        tick_lower: i32,
        tick_upper: i32,
    ) -> Position;

    /// Collect protocol fees
    fn collect_protocol_fees(
        ref self: TContractState, pool_key: PoolKey, recipient: ContractAddress,
    ) -> (u128, u128);
}

/// Pool callback interface for flash accounting
#[starknet::interface]
pub trait IZylithPoolCallback<TContractState> {
    /// Called when tokens are owed to the pool after a mint
    fn zylith_mint_callback(
        ref self: TContractState, amount_0_owed: u256, amount_1_owed: u256, data: Span<felt252>,
    );

    /// Called when tokens are owed to the pool after a swap
    fn zylith_swap_callback(
        ref self: TContractState, amount_0_delta: i256, amount_1_delta: i256, data: Span<felt252>,
    );
}

/// Events emitted by the pool
#[derive(Drop, starknet::Event)]
pub struct PoolInitialized {
    #[key]
    pub pool_key: PoolKey,
    pub sqrt_price: u256,
    pub tick: i32,
}

#[derive(Drop, starknet::Event)]
pub struct Mint {
    #[key]
    pub sender: ContractAddress,
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount: u128,
    pub amount_0: u256,
    pub amount_1: u256,
}

#[derive(Drop, starknet::Event)]
pub struct Burn {
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount: u128,
    pub amount_0: u256,
    pub amount_1: u256,
}

#[derive(Drop, starknet::Event)]
pub struct Swap {
    #[key]
    pub sender: ContractAddress,
    #[key]
    pub recipient: ContractAddress,
    pub amount_0: i256,
    pub amount_1: i256,
    pub sqrt_price: u256,
    pub liquidity: u128,
    pub tick: i32,
}

#[derive(Drop, starknet::Event)]
pub struct Collect {
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub recipient: ContractAddress,
    #[key]
    pub tick_lower: i32,
    pub tick_upper: i32,
    pub amount_0: u128,
    pub amount_1: u128,
}
