use starknet::ContractAddress;
use super::super::clmm::pool::{PoolKey, PoolState};
use super::super::clmm::positions::Position;
use super::super::types::{i256, Tick};

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
        tick_lower: Tick,
        tick_upper: Tick,
        amount: u128,
        recipient: ContractAddress,
    ) -> (u256, u256);

    /// Burn liquidity from a position
    /// Returns (amount_0, amount_1) returned
    fn burn(
        ref self: TContractState, pool_key: PoolKey, tick_lower: Tick, tick_upper: Tick, amount: u128,
    ) -> (u256, u256);

    /// Collect fees from a position
    /// Returns (amount_0, amount_1) collected
    fn collect(
        ref self: TContractState,
        pool_key: PoolKey,
        tick_lower: Tick,
        tick_upper: Tick,
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
        tick_lower: Tick,
        tick_upper: Tick,
    ) -> Position;

    /// Collect protocol fees
    fn collect_protocol_fees(
        ref self: TContractState, pool_key: PoolKey, recipient: ContractAddress,
    ) -> (u128, u128);

    /// Execute a shielded swap via ZK proof
    /// The coordinator verifies the proof and returns verified public inputs.
    /// The pool derives swap parameters (zero_for_one, amount_in) from the proof.
    /// sqrt_price_limit is a caller preference for additional slippage protection.
    fn shielded_swap(
        ref self: TContractState,
        pool_key: PoolKey,
        full_proof_with_hints: Span<felt252>,
        sqrt_price_limit: u256,
    );

    /// Execute a shielded mint (add liquidity) via ZK proof
    /// Tick range is extracted from verified proof public inputs.
    /// Liquidity amount must still be provided by caller (not in proof).
    fn shielded_mint(
        ref self: TContractState,
        pool_key: PoolKey,
        full_proof_with_hints: Span<felt252>,
        liquidity: u128,
    );

    /// Execute a shielded burn (remove liquidity) via ZK proof
    /// Tick range is extracted from verified proof public inputs.
    /// Liquidity amount must still be provided by caller (not in proof).
    fn shielded_burn(
        ref self: TContractState,
        pool_key: PoolKey,
        full_proof_with_hints: Span<felt252>,
        liquidity: u128,
    );

    /// Withdraw tokens from shielded pool via ZK membership proof
    /// The coordinator verifies the proof and returns verified public inputs
    /// containing the recipient address, token, and amount.
    /// The pool transfers the specified tokens to the verified recipient.
    fn withdraw(ref self: TContractState, full_proof_with_hints: Span<felt252>);
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
    pub tick: Tick,
}

#[derive(Drop, starknet::Event)]
pub struct Mint {
    #[key]
    pub sender: ContractAddress,
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub tick_lower: Tick,
    pub tick_upper: Tick,
    pub amount: u128,
    pub amount_0: u256,
    pub amount_1: u256,
}

#[derive(Drop, starknet::Event)]
pub struct Burn {
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub tick_lower: Tick,
    pub tick_upper: Tick,
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
    pub tick: Tick,
}

#[derive(Drop, starknet::Event)]
pub struct Collect {
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub recipient: ContractAddress,
    #[key]
    pub tick_lower: Tick,
    pub tick_upper: Tick,
    pub amount_0: u128,
    pub amount_1: u128,
}
