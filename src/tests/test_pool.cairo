use crate::clmm::pool::PoolKey;
use crate::clmm::fees::StandardFeeTiers;
use crate::types::{i256, I256Trait};
use crate::interfaces::pool::{IZylithPoolDispatcher, IZylithPoolDispatcherTrait};
use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use snforge_std::{start_cheat_caller_address, stop_cheat_caller_address};

/// ABI for mock coordinator setter functions
#[starknet::interface]
trait IMockCoordinatorSetters<TContractState> {
    fn set_mock_swap_params(
        ref self: TContractState,
        token_in: ContractAddress,
        token_out: ContractAddress,
        amount_in: u256,
        amount_out_min: u256,
    );
    fn set_mock_tick_params(ref self: TContractState, tick_lower: i32, tick_upper: i32);
}

// ========================================================================
// Constants
// ========================================================================

const INITIAL_SUPPLY: u256 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
/// sqrt_price = 2^128 = price 1.0 in Q128.128
const SQRT_PRICE_1_0: u256 = 0x100000000000000000000000000000000;

// ========================================================================
// Test addresses
// ========================================================================

fn admin() -> ContractAddress {
    0x100.try_into().unwrap()
}

fn user1() -> ContractAddress {
    0x200.try_into().unwrap()
}

fn user2() -> ContractAddress {
    0x300.try_into().unwrap()
}

// ========================================================================
// Deploy helpers
// ========================================================================

fn deploy_erc20(recipient: ContractAddress) -> ContractAddress {
    let contract = declare("MockERC20").unwrap().contract_class();
    let mut calldata = array![];
    INITIAL_SUPPLY.serialize(ref calldata);
    recipient.serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    address
}

fn deploy_coordinator() -> ContractAddress {
    let contract = declare("MockCoordinator").unwrap().contract_class();
    let mut calldata = array![];
    admin().serialize(ref calldata);
    let (address, _) = contract.deploy(@calldata).unwrap();
    address
}

fn deploy_pool(coordinator: ContractAddress) -> ContractAddress {
    let contract = declare("ZylithPool").unwrap().contract_class();
    let mut calldata = array![];
    admin().serialize(ref calldata);
    coordinator.serialize(ref calldata);
    1_u8.serialize(ref calldata); // protocol_fee = 1 (10% of swap fees)
    let (address, _) = contract.deploy(@calldata).unwrap();
    address
}

fn create_pool_key(token_a: ContractAddress, token_b: ContractAddress) -> PoolKey {
    let fee_tier = StandardFeeTiers::fee_tier_30(); // 0.30%, tick_spacing=60
    crate::clmm::pool::create_pool_key(token_a, token_b, fee_tier)
}

/// Full test setup: deploys pool + coordinator + two ERC20 tokens.
/// Tokens are minted to user1, and user1 approves pool to spend them.
fn setup() -> (ContractAddress, ContractAddress, ContractAddress, ContractAddress, PoolKey) {
    let coordinator = deploy_coordinator();
    let pool_address = deploy_pool(coordinator);

    let token_a = deploy_erc20(user1());
    let token_b = deploy_erc20(user1());
    let pool_key = create_pool_key(token_a, token_b);

    // User1 approves pool to spend both tokens
    start_cheat_caller_address(pool_key.token_0, user1());
    IERC20Dispatcher { contract_address: pool_key.token_0 }
        .approve(pool_address, INITIAL_SUPPLY);
    stop_cheat_caller_address(pool_key.token_0);

    start_cheat_caller_address(pool_key.token_1, user1());
    IERC20Dispatcher { contract_address: pool_key.token_1 }
        .approve(pool_address, INITIAL_SUPPLY);
    stop_cheat_caller_address(pool_key.token_1);

    (pool_address, coordinator, pool_key.token_0, pool_key.token_1, pool_key)
}

// ========================================================================
// Pool Initialization Tests
// ========================================================================

#[test]
fn test_initialize_pool() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    let state = pool.initialize(pool_key, SQRT_PRICE_1_0);
    stop_cheat_caller_address(pool_address);

    assert(state.sqrt_price == SQRT_PRICE_1_0, 'Wrong sqrt_price');
    assert(state.tick == 0, 'Wrong tick');
    assert(state.liquidity == 0, 'Liquidity should be 0');
}

#[test]
#[should_panic(expected: ('Pool already initialized',))]
fn test_initialize_pool_twice_fails() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);
    pool.initialize(pool_key, SQRT_PRICE_1_0);
    stop_cheat_caller_address(pool_address);
}

// ========================================================================
// Mint / Burn Tests
// ========================================================================

#[test]
fn test_mint_liquidity() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    let tick_lower: i32 = -120;
    let tick_upper: i32 = 120;
    let liquidity: u128 = 1_000_000;

    let (amount_0, amount_1) = pool.mint(pool_key, tick_lower, tick_upper, liquidity, user1());
    stop_cheat_caller_address(pool_address);

    // Price is in range, both tokens required
    assert(amount_0 > 0, 'Should need token0');
    assert(amount_1 > 0, 'Should need token1');

    // Pool liquidity is active (tick 0 is within [-120, 120])
    let state = pool.get_pool_state(pool_key);
    assert(state.liquidity == liquidity, 'Pool liquidity mismatch');

    // Position recorded correctly
    let pos = pool.get_position(pool_key, user1(), tick_lower, tick_upper);
    assert(pos.liquidity == liquidity, 'Position liquidity mismatch');
}

#[test]
fn test_burn_liquidity() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    let tick_lower: i32 = -120;
    let tick_upper: i32 = 120;
    let liquidity: u128 = 1_000_000;
    pool.mint(pool_key, tick_lower, tick_upper, liquidity, user1());

    // Burn half
    let burn_amount: u128 = 500_000;
    let (amount_0, amount_1) = pool.burn(pool_key, tick_lower, tick_upper, burn_amount);
    stop_cheat_caller_address(pool_address);

    assert(amount_0 > 0, 'Should return token0');
    assert(amount_1 > 0, 'Should return token1');

    let pos = pool.get_position(pool_key, user1(), tick_lower, tick_upper);
    assert(pos.liquidity == liquidity - burn_amount, 'Position burn mismatch');

    let state = pool.get_pool_state(pool_key);
    assert(state.liquidity == liquidity - burn_amount, 'Pool burn mismatch');
}

// ========================================================================
// Swap Tests
// ========================================================================

#[test]
fn test_swap_zero_for_one() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    // Provide deep liquidity
    let tick_lower: i32 = -120;
    let tick_upper: i32 = 120;
    let liquidity: u128 = 10_000_000_000;
    pool.mint(pool_key, tick_lower, tick_upper, liquidity, user1());

    // Swap token0 -> token1
    let amount_in: u256 = 1000;
    let amount_specified = I256Trait::from_u256(amount_in);
    let sqrt_price_limit: u256 = crate::clmm::math::sqrt_price::MIN_SQRT_PRICE + 1;

    let (amount_0, amount_1) = pool.swap(
        pool_key, true, amount_specified, sqrt_price_limit, user1(),
    );
    stop_cheat_caller_address(pool_address);

    // User pays token0 (positive), receives token1 (negative)
    assert(!amount_0.is_negative(), 'amount0 should be positive');
    assert(amount_0.mag > 0, 'amount0 should be > 0');
    assert(amount_1.is_negative(), 'amount1 should be negative');

    // Price moved down
    let state = pool.get_pool_state(pool_key);
    assert(state.sqrt_price < SQRT_PRICE_1_0, 'Price should decrease');
}

#[test]
fn test_swap_one_for_zero() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    let tick_lower: i32 = -120;
    let tick_upper: i32 = 120;
    let liquidity: u128 = 10_000_000_000;
    pool.mint(pool_key, tick_lower, tick_upper, liquidity, user1());

    // Swap token1 -> token0
    let amount_in: u256 = 1000;
    let amount_specified = I256Trait::from_u256(amount_in);
    let sqrt_price_limit: u256 = crate::clmm::math::sqrt_price::MAX_SQRT_PRICE - 1;

    let (amount_0, amount_1) = pool.swap(
        pool_key, false, amount_specified, sqrt_price_limit, user1(),
    );
    stop_cheat_caller_address(pool_address);

    // User pays token1 (positive), receives token0 (negative)
    assert(!amount_1.is_negative(), 'amount1 should be positive');
    assert(amount_0.is_negative(), 'amount0 should be negative');

    // Price moved up
    let state = pool.get_pool_state(pool_key);
    assert(state.sqrt_price > SQRT_PRICE_1_0, 'Price should increase');
}

// ========================================================================
// Protocol Fee Tests
// ========================================================================

#[test]
fn test_collect_protocol_fees() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    let tick_lower: i32 = -120;
    let tick_upper: i32 = 120;
    let liquidity: u128 = 10_000_000_000;
    pool.mint(pool_key, tick_lower, tick_upper, liquidity, user1());

    // Swap to generate fees
    let amount_in: u256 = 100_000;
    let amount_specified = I256Trait::from_u256(amount_in);
    let sqrt_price_limit: u256 = crate::clmm::math::sqrt_price::MIN_SQRT_PRICE + 1;
    pool.swap(pool_key, true, amount_specified, sqrt_price_limit, user1());
    stop_cheat_caller_address(pool_address);

    // Verify protocol fees accumulated
    let state = pool.get_pool_state(pool_key);
    assert(state.protocol_fees_0 > 0, 'Should have protocol fees');

    // Admin collects
    start_cheat_caller_address(pool_address, admin());
    let (fees_0, _fees_1) = pool.collect_protocol_fees(pool_key, admin());
    stop_cheat_caller_address(pool_address);

    assert(fees_0 > 0, 'Should collect fees');

    // Protocol fees zeroed after collection
    let state_after = pool.get_pool_state(pool_key);
    assert(state_after.protocol_fees_0 == 0, 'Fees should be zeroed');
}

#[test]
#[should_panic(expected: ('Only admin',))]
fn test_collect_protocol_fees_non_admin_fails() {
    let (pool_address, _, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);
    stop_cheat_caller_address(pool_address);

    // Non-admin tries to collect
    start_cheat_caller_address(pool_address, user2());
    pool.collect_protocol_fees(pool_key, user2());
    stop_cheat_caller_address(pool_address);
}

// ========================================================================
// Shielded Operation Tests
// ========================================================================

#[test]
fn test_shielded_swap() {
    let (pool_address, coordinator, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    // Need public liquidity for the swap to trade against
    let tick_lower: i32 = -120;
    let tick_upper: i32 = 120;
    let liquidity: u128 = 10_000_000_000;
    pool.mint(pool_key, tick_lower, tick_upper, liquidity, user1());
    stop_cheat_caller_address(pool_address);

    // Configure mock coordinator with verified swap params
    let mock = IMockCoordinatorSettersDispatcher { contract_address: coordinator };
    mock.set_mock_swap_params(pool_key.token_0, pool_key.token_1, 1000, 0);

    // Shielded swap — amount_in and tokens come from verified proof
    let dummy_proof: Array<felt252> = array![1, 2, 3];
    let sqrt_price_limit: u256 = crate::clmm::math::sqrt_price::MIN_SQRT_PRICE + 1;

    start_cheat_caller_address(pool_address, user1());
    pool.shielded_swap(pool_key, dummy_proof.span(), sqrt_price_limit);
    stop_cheat_caller_address(pool_address);

    // CLMM state updated: price moved down
    let state = pool.get_pool_state(pool_key);
    assert(state.sqrt_price < SQRT_PRICE_1_0, 'Shielded swap should move price');
}

#[test]
fn test_shielded_mint() {
    let (pool_address, coordinator, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);
    stop_cheat_caller_address(pool_address);

    // Configure mock coordinator with verified tick params
    let mock = IMockCoordinatorSettersDispatcher { contract_address: coordinator };
    mock.set_mock_tick_params(-120, 120);

    // Shielded mint: ticks from proof, liquidity from caller
    let dummy_proof: Array<felt252> = array![1, 2, 3];
    let liquidity: u128 = 1_000_000;

    start_cheat_caller_address(pool_address, user1());
    pool.shielded_mint(pool_key, dummy_proof.span(), liquidity);
    stop_cheat_caller_address(pool_address);

    let state = pool.get_pool_state(pool_key);
    assert(state.liquidity == liquidity, 'Shielded mint should add liq');
}

#[test]
fn test_shielded_burn() {
    let (pool_address, coordinator, _, _, pool_key) = setup();
    let pool = IZylithPoolDispatcher { contract_address: pool_address };

    // Configure mock coordinator with verified tick params
    let mock = IMockCoordinatorSettersDispatcher { contract_address: coordinator };
    mock.set_mock_tick_params(-120, 120);

    start_cheat_caller_address(pool_address, user1());
    pool.initialize(pool_key, SQRT_PRICE_1_0);

    // Shielded mint first
    let dummy_proof: Array<felt252> = array![1, 2, 3];
    let liquidity: u128 = 1_000_000;
    pool.shielded_mint(pool_key, dummy_proof.span(), liquidity);

    // Shielded burn half
    let burn_amount: u128 = 500_000;
    pool.shielded_burn(pool_key, dummy_proof.span(), burn_amount);
    stop_cheat_caller_address(pool_address);

    let state = pool.get_pool_state(pool_key);
    assert(state.liquidity == liquidity - burn_amount, 'Shielded burn mismatch');
}
