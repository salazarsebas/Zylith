/// ZylithPool - Singleton Concentrated Liquidity Market Maker Contract
///
/// Manages multiple pools via PoolKey. Supports both public (standard) and
/// shielded (ZK-proof-based) operations.
///
/// ## Architecture
/// - Pool stores CLMM state (price, liquidity, ticks, positions)
/// - Calls VerifierCoordinator for shielded operation proof verification
/// - Uses IERC20 for token transfers on public operations
/// - Library functions from `crate::clmm::*` handle all math

#[starknet::contract]
pub mod ZylithPool {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use core::poseidon::PoseidonTrait;
    use core::hash::HashStateTrait;

    // CLMM library imports
    use crate::clmm::pool::{
        PoolKey, PoolState, TickInfo, validate_pool_key, initialize_pool_state, update_tick,
        cross_tick,
    };
    use crate::clmm::positions::{
        Position, mint_position, burn_position, collect_fees, validate_position_params,
    };
    use crate::clmm::swap::compute_swap_step;
    use crate::clmm::fees::{get_fee_growth_inside, update_fee_growth, calculate_protocol_fee};
    use crate::clmm::tick_bitmap::{position as tick_position, flip_bit};
    use crate::clmm::math::tick_math::{
        get_sqrt_price_at_tick, get_tick_at_sqrt_price, MIN_TICK, MAX_TICK, align_tick_down,
        align_tick_up,
    };
    use crate::clmm::math::sqrt_price::{MIN_SQRT_PRICE, MAX_SQRT_PRICE};
    use crate::types::{i256, I256Trait};

    // Interface imports
    use crate::interfaces::pool::IZylithPool;
    use crate::interfaces::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::interfaces::coordinator::{
        IVerifierCoordinatorDispatcher, IVerifierCoordinatorDispatcherTrait,
    };

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    const MAX_SWAP_LOOPS: u32 = 100;

    // ========================================================================
    // STORAGE
    // ========================================================================

    #[storage]
    struct Storage {
        // Pool state: hash(pool_key) => PoolState
        pools: Map<felt252, PoolState>,
        // Tick info: hash(pool_hash, tick) => TickInfo
        ticks: Map<felt252, TickInfo>,
        // Tick bitmaps: hash(pool_hash, word_pos) => bitmap word
        tick_bitmaps: Map<felt252, u256>,
        // Positions: hash(pool_hash, owner, tick_lower, tick_upper) => Position
        positions: Map<felt252, Position>,
        // Pool initialization flag
        pool_initialized: Map<felt252, bool>,
        // VerifierCoordinator contract address
        coordinator: ContractAddress,
        // Admin address
        admin: ContractAddress,
        // Protocol fee fraction (0-10, where N means N/10 of swap fees go to protocol)
        protocol_fee: u8,
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        PoolCreated: PoolCreated,
        LiquidityMinted: LiquidityMinted,
        LiquidityBurned: LiquidityBurned,
        SwapExecuted: SwapExecuted,
        FeesCollected: FeesCollected,
        ProtocolFeesCollected: ProtocolFeesCollected,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PoolCreated {
        #[key]
        pub pool_hash: felt252,
        pub token_0: ContractAddress,
        pub token_1: ContractAddress,
        pub fee: u32,
        pub sqrt_price: u256,
        pub tick: i32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LiquidityMinted {
        #[key]
        pub pool_hash: felt252,
        pub sender: ContractAddress,
        pub owner: ContractAddress,
        pub tick_lower: i32,
        pub tick_upper: i32,
        pub liquidity: u128,
        pub amount_0: u256,
        pub amount_1: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LiquidityBurned {
        #[key]
        pub pool_hash: felt252,
        pub owner: ContractAddress,
        pub tick_lower: i32,
        pub tick_upper: i32,
        pub liquidity: u128,
        pub amount_0: u256,
        pub amount_1: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SwapExecuted {
        #[key]
        pub pool_hash: felt252,
        pub sender: ContractAddress,
        pub recipient: ContractAddress,
        pub amount_0: u256,
        pub amount_1: u256,
        pub amount_0_is_negative: bool,
        pub amount_1_is_negative: bool,
        pub sqrt_price: u256,
        pub liquidity: u128,
        pub tick: i32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FeesCollected {
        #[key]
        pub pool_hash: felt252,
        pub owner: ContractAddress,
        pub recipient: ContractAddress,
        pub amount_0: u128,
        pub amount_1: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ProtocolFeesCollected {
        #[key]
        pub pool_hash: felt252,
        pub recipient: ContractAddress,
        pub amount_0: u128,
        pub amount_1: u128,
    }

    // ========================================================================
    // ERRORS
    // ========================================================================

    pub mod Errors {
        pub const POOL_ALREADY_INITIALIZED: felt252 = 'Pool already initialized';
        pub const POOL_NOT_INITIALIZED: felt252 = 'Pool not initialized';
        pub const INVALID_PROTOCOL_FEE: felt252 = 'Invalid protocol fee';
        pub const ONLY_ADMIN: felt252 = 'Only admin';
        pub const INVALID_AMOUNT: felt252 = 'Invalid amount';
        pub const INVALID_SQRT_PRICE_LIMIT: felt252 = 'Invalid sqrt price limit';
        pub const SWAP_LOOP_LIMIT: felt252 = 'Swap loop limit reached';
        pub const INVALID_PROOF: felt252 = 'Invalid proof';
        pub const ZERO_LIQUIDITY: felt252 = 'Zero liquidity';
    }

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        coordinator: ContractAddress,
        protocol_fee: u8,
    ) {
        assert(protocol_fee <= 10, Errors::INVALID_PROTOCOL_FEE);
        self.admin.write(admin);
        self.coordinator.write(coordinator);
        self.protocol_fee.write(protocol_fee);
    }

    // ========================================================================
    // IZylithPool IMPLEMENTATION
    // ========================================================================

    #[abi(embed_v0)]
    impl ZylithPoolImpl of IZylithPool<ContractState> {
        // ================================================================
        // POOL INITIALIZATION
        // ================================================================

        fn initialize(
            ref self: ContractState, pool_key: PoolKey, sqrt_price: u256,
        ) -> PoolState {
            validate_pool_key(pool_key);

            let pool_hash = InternalImpl::_hash_pool_key(@self, pool_key);
            assert(!self.pool_initialized.read(pool_hash), Errors::POOL_ALREADY_INITIALIZED);

            let tick = get_tick_at_sqrt_price(sqrt_price);
            let state = initialize_pool_state(sqrt_price, tick);

            self.pools.write(pool_hash, state);
            self.pool_initialized.write(pool_hash, true);

            self
                .emit(
                    PoolCreated {
                        pool_hash,
                        token_0: pool_key.token_0,
                        token_1: pool_key.token_1,
                        fee: pool_key.fee_tier.fee,
                        sqrt_price,
                        tick,
                    },
                );

            state
        }

        // ================================================================
        // READ FUNCTIONS
        // ================================================================

        fn get_pool_state(self: @ContractState, pool_key: PoolKey) -> PoolState {
            let pool_hash = InternalImpl::_hash_pool_key(self, pool_key);
            InternalImpl::_assert_pool_initialized(self, pool_hash);
            self.pools.read(pool_hash)
        }

        fn get_position(
            self: @ContractState,
            pool_key: PoolKey,
            owner: ContractAddress,
            tick_lower: i32,
            tick_upper: i32,
        ) -> Position {
            let pool_hash = InternalImpl::_hash_pool_key(self, pool_key);
            let position_hash = InternalImpl::_hash_position_key(
                self, pool_hash, owner, tick_lower, tick_upper,
            );
            self.positions.read(position_hash)
        }

        // ================================================================
        // MINT (Add Liquidity)
        // ================================================================

        fn mint(
            ref self: ContractState,
            pool_key: PoolKey,
            tick_lower: i32,
            tick_upper: i32,
            amount: u128,
            recipient: ContractAddress,
        ) -> (u256, u256) {
            assert(amount > 0, Errors::ZERO_LIQUIDITY);

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            let mut pool_state = self.pools.read(pool_hash);
            validate_position_params(tick_lower, tick_upper, pool_key.fee_tier.tick_spacing);

            // Calculate fee growth inside position range
            let (fee_growth_inside_0, fee_growth_inside_1) = self
                ._get_fee_growth_inside(pool_hash, pool_state, tick_lower, tick_upper);

            // Read or initialize position
            let position_hash = self
                ._hash_position_key(pool_hash, recipient, tick_lower, tick_upper);
            let pos = self.positions.read(position_hash);

            // Mint position using library function
            let (updated_pos, result) = mint_position(
                pos,
                tick_lower,
                tick_upper,
                pool_key.fee_tier.tick_spacing,
                amount,
                pool_state.sqrt_price,
                fee_growth_inside_0,
                fee_growth_inside_1,
            );

            // Update ticks and bitmap
            let liquidity_delta: i128 = amount.try_into().unwrap();
            self
                ._update_ticks_for_position(
                    pool_hash,
                    pool_state,
                    tick_lower,
                    tick_upper,
                    liquidity_delta,
                    pool_key.fee_tier.tick_spacing,
                );

            // Update pool active liquidity if current tick is in range
            if pool_state.tick >= tick_lower && pool_state.tick < tick_upper {
                pool_state.liquidity = pool_state.liquidity + amount;
            }

            // Write updated state
            self.positions.write(position_hash, updated_pos);
            self.pools.write(pool_hash, pool_state);

            // Transfer tokens from caller to pool
            let caller = get_caller_address();
            let pool_address = get_contract_address();
            if result.amount_0 > 0 {
                IERC20Dispatcher { contract_address: pool_key.token_0 }
                    .transfer_from(caller, pool_address, result.amount_0);
            }
            if result.amount_1 > 0 {
                IERC20Dispatcher { contract_address: pool_key.token_1 }
                    .transfer_from(caller, pool_address, result.amount_1);
            }

            self
                .emit(
                    LiquidityMinted {
                        pool_hash,
                        sender: caller,
                        owner: recipient,
                        tick_lower,
                        tick_upper,
                        liquidity: amount,
                        amount_0: result.amount_0,
                        amount_1: result.amount_1,
                    },
                );

            (result.amount_0, result.amount_1)
        }

        // ================================================================
        // BURN (Remove Liquidity)
        // ================================================================

        fn burn(
            ref self: ContractState,
            pool_key: PoolKey,
            tick_lower: i32,
            tick_upper: i32,
            amount: u128,
        ) -> (u256, u256) {
            assert(amount > 0, Errors::ZERO_LIQUIDITY);

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            let mut pool_state = self.pools.read(pool_hash);
            let caller = get_caller_address();

            // Calculate fee growth inside
            let (fee_growth_inside_0, fee_growth_inside_1) = self
                ._get_fee_growth_inside(pool_hash, pool_state, tick_lower, tick_upper);

            // Read position
            let position_hash = self
                ._hash_position_key(pool_hash, caller, tick_lower, tick_upper);
            let pos = self.positions.read(position_hash);

            // Burn position using library function
            let (updated_pos, result) = burn_position(
                pos,
                tick_lower,
                tick_upper,
                amount,
                pool_state.sqrt_price,
                fee_growth_inside_0,
                fee_growth_inside_1,
            );

            // Update ticks (negative liquidity delta)
            let neg_delta: i128 = -(amount.try_into().unwrap());
            self
                ._update_ticks_for_position(
                    pool_hash,
                    pool_state,
                    tick_lower,
                    tick_upper,
                    neg_delta,
                    pool_key.fee_tier.tick_spacing,
                );

            // Update pool active liquidity if current tick is in range
            if pool_state.tick >= tick_lower && pool_state.tick < tick_upper {
                pool_state.liquidity = pool_state.liquidity - amount;
            }

            // Write state
            self.positions.write(position_hash, updated_pos);
            self.pools.write(pool_hash, pool_state);

            self
                .emit(
                    LiquidityBurned {
                        pool_hash,
                        owner: caller,
                        tick_lower,
                        tick_upper,
                        liquidity: amount,
                        amount_0: result.amount_0,
                        amount_1: result.amount_1,
                    },
                );

            (result.amount_0, result.amount_1)
        }

        // ================================================================
        // COLLECT FEES
        // ================================================================

        fn collect(
            ref self: ContractState,
            pool_key: PoolKey,
            tick_lower: i32,
            tick_upper: i32,
            amount_0_requested: u128,
            amount_1_requested: u128,
            recipient: ContractAddress,
        ) -> (u128, u128) {
            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            let caller = get_caller_address();
            let position_hash = self
                ._hash_position_key(pool_hash, caller, tick_lower, tick_upper);

            // Update position fee accounting first
            let pool_state = self.pools.read(pool_hash);
            let (fee_growth_inside_0, fee_growth_inside_1) = self
                ._get_fee_growth_inside(pool_hash, pool_state, tick_lower, tick_upper);

            let mut pos = self.positions.read(position_hash);
            // Trigger fee accumulation by calling update_position with 0 delta
            pos =
                crate::clmm::positions::update_position(
                    pos, 0, fee_growth_inside_0, fee_growth_inside_1,
                );

            // Collect fees
            let (updated_pos, amount_0, amount_1) = collect_fees(
                pos, amount_0_requested, amount_1_requested,
            );

            self.positions.write(position_hash, updated_pos);

            // Transfer collected fees to recipient
            if amount_0 > 0 {
                IERC20Dispatcher { contract_address: pool_key.token_0 }
                    .transfer(recipient, amount_0.into());
            }
            if amount_1 > 0 {
                IERC20Dispatcher { contract_address: pool_key.token_1 }
                    .transfer(recipient, amount_1.into());
            }

            self
                .emit(
                    FeesCollected { pool_hash, owner: caller, recipient, amount_0, amount_1 },
                );

            (amount_0, amount_1)
        }

        // ================================================================
        // SWAP
        // ================================================================

        fn swap(
            ref self: ContractState,
            pool_key: PoolKey,
            zero_for_one: bool,
            amount_specified: i256,
            sqrt_price_limit: u256,
            recipient: ContractAddress,
        ) -> (i256, i256) {
            assert(!amount_specified.is_zero(), Errors::INVALID_AMOUNT);
            // Only support exact input for now (positive amount_specified)
            assert(!amount_specified.is_negative(), Errors::INVALID_AMOUNT);

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            let mut pool_state = self.pools.read(pool_hash);

            // Validate price limit
            if zero_for_one {
                assert(
                    sqrt_price_limit < pool_state.sqrt_price
                        && sqrt_price_limit > MIN_SQRT_PRICE,
                    Errors::INVALID_SQRT_PRICE_LIMIT,
                );
            } else {
                assert(
                    sqrt_price_limit > pool_state.sqrt_price
                        && sqrt_price_limit < MAX_SQRT_PRICE,
                    Errors::INVALID_SQRT_PRICE_LIMIT,
                );
            }

            let amount_specified_abs = amount_specified.abs();

            // Execute swap and get results
            let (
                amount_in_total,
                amount_out_total,
                final_sqrt_price,
                final_tick,
                final_liquidity,
                final_fee_growth_0,
                final_fee_growth_1,
                final_protocol_fees_0,
                final_protocol_fees_1,
            ) =
                self
                ._execute_swap_loop(
                    pool_hash,
                    pool_state,
                    pool_key.fee_tier,
                    zero_for_one,
                    amount_specified_abs,
                    sqrt_price_limit,
                );

            // Update pool state
            pool_state.sqrt_price = final_sqrt_price;
            pool_state.tick = final_tick;
            pool_state.liquidity = final_liquidity;
            pool_state.fee_growth_global_0 = final_fee_growth_0;
            pool_state.fee_growth_global_1 = final_fee_growth_1;
            pool_state.protocol_fees_0 = final_protocol_fees_0;
            pool_state.protocol_fees_1 = final_protocol_fees_1;
            self.pools.write(pool_hash, pool_state);

            // Build signed amounts: positive = pool receives, negative = pool sends
            let (amount_0, amount_1) = if zero_for_one {
                (I256Trait::from_u256(amount_in_total), I256Trait::new(amount_out_total, true))
            } else {
                (I256Trait::new(amount_out_total, true), I256Trait::from_u256(amount_in_total))
            };

            // Transfer tokens
            let caller = get_caller_address();
            let pool_address = get_contract_address();

            // Collect input token from caller
            if zero_for_one {
                if amount_in_total > 0 {
                    IERC20Dispatcher { contract_address: pool_key.token_0 }
                        .transfer_from(caller, pool_address, amount_in_total);
                }
            } else {
                if amount_in_total > 0 {
                    IERC20Dispatcher { contract_address: pool_key.token_1 }
                        .transfer_from(caller, pool_address, amount_in_total);
                }
            }

            // Send output token to recipient
            if zero_for_one {
                if amount_out_total > 0 {
                    IERC20Dispatcher { contract_address: pool_key.token_1 }
                        .transfer(recipient, amount_out_total);
                }
            } else {
                if amount_out_total > 0 {
                    IERC20Dispatcher { contract_address: pool_key.token_0 }
                        .transfer(recipient, amount_out_total);
                }
            }

            self
                .emit(
                    SwapExecuted {
                        pool_hash,
                        sender: caller,
                        recipient,
                        amount_0: amount_0.mag,
                        amount_1: amount_1.mag,
                        amount_0_is_negative: amount_0.sign,
                        amount_1_is_negative: amount_1.sign,
                        sqrt_price: final_sqrt_price,
                        liquidity: final_liquidity,
                        tick: final_tick,
                    },
                );

            (amount_0, amount_1)
        }

        // ================================================================
        // COLLECT PROTOCOL FEES
        // ================================================================

        fn collect_protocol_fees(
            ref self: ContractState, pool_key: PoolKey, recipient: ContractAddress,
        ) -> (u128, u128) {
            self._assert_admin();

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            let mut pool_state = self.pools.read(pool_hash);
            let amount_0 = pool_state.protocol_fees_0;
            let amount_1 = pool_state.protocol_fees_1;

            pool_state.protocol_fees_0 = 0;
            pool_state.protocol_fees_1 = 0;
            self.pools.write(pool_hash, pool_state);

            if amount_0 > 0 {
                IERC20Dispatcher { contract_address: pool_key.token_0 }
                    .transfer(recipient, amount_0.into());
            }
            if amount_1 > 0 {
                IERC20Dispatcher { contract_address: pool_key.token_1 }
                    .transfer(recipient, amount_1.into());
            }

            self
                .emit(
                    ProtocolFeesCollected { pool_hash, recipient, amount_0, amount_1 },
                );

            (amount_0, amount_1)
        }

        // ================================================================
        // SHIELDED OPERATIONS
        // ================================================================

        /// Shielded swap: verify ZK proof via coordinator, then update CLMM state.
        /// No token transfers occur — tokens are managed via the commitment system.
        ///
        /// NOTE: In production, swap parameters (zero_for_one, amount, limit) should be
        /// extracted from verified proof public inputs to prevent parameter tampering.
        /// Current implementation trusts caller-provided parameters backed by coordinator
        /// proof verification.
        fn shielded_swap(
            ref self: ContractState,
            pool_key: PoolKey,
            full_proof_with_hints: Span<felt252>,
            zero_for_one: bool,
            amount_specified: u256,
            sqrt_price_limit: u256,
        ) {
            assert(amount_specified > 0, Errors::INVALID_AMOUNT);

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            // Verify proof via coordinator (handles nullifiers + Merkle tree)
            let coordinator = IVerifierCoordinatorDispatcher {
                contract_address: self.coordinator.read(),
            };
            let is_valid = coordinator.verify_swap(full_proof_with_hints);
            assert(is_valid, Errors::INVALID_PROOF);

            // Execute swap on CLMM state (no token transfers)
            let mut pool_state = self.pools.read(pool_hash);

            let (
                _amount_in,
                _amount_out,
                final_sqrt_price,
                final_tick,
                final_liquidity,
                final_fee_growth_0,
                final_fee_growth_1,
                final_protocol_fees_0,
                final_protocol_fees_1,
            ) =
                self
                ._execute_swap_loop(
                    pool_hash,
                    pool_state,
                    pool_key.fee_tier,
                    zero_for_one,
                    amount_specified,
                    sqrt_price_limit,
                );

            pool_state.sqrt_price = final_sqrt_price;
            pool_state.tick = final_tick;
            pool_state.liquidity = final_liquidity;
            pool_state.fee_growth_global_0 = final_fee_growth_0;
            pool_state.fee_growth_global_1 = final_fee_growth_1;
            pool_state.protocol_fees_0 = final_protocol_fees_0;
            pool_state.protocol_fees_1 = final_protocol_fees_1;
            self.pools.write(pool_hash, pool_state);
        }

        /// Shielded mint: verify ZK proof, then add liquidity to CLMM state.
        fn shielded_mint(
            ref self: ContractState,
            pool_key: PoolKey,
            full_proof_with_hints: Span<felt252>,
            tick_lower: i32,
            tick_upper: i32,
            liquidity: u128,
        ) {
            assert(liquidity > 0, Errors::ZERO_LIQUIDITY);

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            // Verify proof via coordinator
            let coordinator = IVerifierCoordinatorDispatcher {
                contract_address: self.coordinator.read(),
            };
            let is_valid = coordinator.verify_mint(full_proof_with_hints);
            assert(is_valid, Errors::INVALID_PROOF);

            // Add liquidity to CLMM state (no token transfers)
            let mut pool_state = self.pools.read(pool_hash);
            validate_position_params(tick_lower, tick_upper, pool_key.fee_tier.tick_spacing);

            let (fee_growth_inside_0, fee_growth_inside_1) = self
                ._get_fee_growth_inside(pool_hash, pool_state, tick_lower, tick_upper);

            // Use a deterministic "shielded" owner address derived from the proof
            // For now, use the caller as position owner
            let owner = get_caller_address();
            let position_hash = self
                ._hash_position_key(pool_hash, owner, tick_lower, tick_upper);
            let pos = self.positions.read(position_hash);

            let (updated_pos, _result) = mint_position(
                pos,
                tick_lower,
                tick_upper,
                pool_key.fee_tier.tick_spacing,
                liquidity,
                pool_state.sqrt_price,
                fee_growth_inside_0,
                fee_growth_inside_1,
            );

            let liquidity_delta: i128 = liquidity.try_into().unwrap();
            self
                ._update_ticks_for_position(
                    pool_hash,
                    pool_state,
                    tick_lower,
                    tick_upper,
                    liquidity_delta,
                    pool_key.fee_tier.tick_spacing,
                );

            if pool_state.tick >= tick_lower && pool_state.tick < tick_upper {
                pool_state.liquidity = pool_state.liquidity + liquidity;
            }

            self.positions.write(position_hash, updated_pos);
            self.pools.write(pool_hash, pool_state);
        }

        /// Shielded burn: verify ZK proof, then remove liquidity from CLMM state.
        fn shielded_burn(
            ref self: ContractState,
            pool_key: PoolKey,
            full_proof_with_hints: Span<felt252>,
            tick_lower: i32,
            tick_upper: i32,
            liquidity: u128,
        ) {
            assert(liquidity > 0, Errors::ZERO_LIQUIDITY);

            let pool_hash = self._hash_pool_key(pool_key);
            self._assert_pool_initialized(pool_hash);

            // Verify proof via coordinator
            let coordinator = IVerifierCoordinatorDispatcher {
                contract_address: self.coordinator.read(),
            };
            let is_valid = coordinator.verify_burn(full_proof_with_hints);
            assert(is_valid, Errors::INVALID_PROOF);

            // Remove liquidity from CLMM state (no token transfers)
            let mut pool_state = self.pools.read(pool_hash);

            let (fee_growth_inside_0, fee_growth_inside_1) = self
                ._get_fee_growth_inside(pool_hash, pool_state, tick_lower, tick_upper);

            let owner = get_caller_address();
            let position_hash = self
                ._hash_position_key(pool_hash, owner, tick_lower, tick_upper);
            let pos = self.positions.read(position_hash);

            let (updated_pos, _result) = burn_position(
                pos,
                tick_lower,
                tick_upper,
                liquidity,
                pool_state.sqrt_price,
                fee_growth_inside_0,
                fee_growth_inside_1,
            );

            let neg_delta: i128 = -(liquidity.try_into().unwrap());
            self
                ._update_ticks_for_position(
                    pool_hash,
                    pool_state,
                    tick_lower,
                    tick_upper,
                    neg_delta,
                    pool_key.fee_tier.tick_spacing,
                );

            if pool_state.tick >= tick_lower && pool_state.tick < tick_upper {
                pool_state.liquidity = pool_state.liquidity - liquidity;
            }

            self.positions.write(position_hash, updated_pos);
            self.pools.write(pool_hash, pool_state);
        }
    }

    // ========================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        // ================================================================
        // HASH HELPERS
        // ================================================================

        /// Hash a PoolKey into a single felt252 for storage keys
        fn _hash_pool_key(self: @ContractState, pool_key: PoolKey) -> felt252 {
            let token_0_felt: felt252 = pool_key.token_0.into();
            let token_1_felt: felt252 = pool_key.token_1.into();
            PoseidonTrait::new()
                .update(token_0_felt)
                .update(token_1_felt)
                .update(pool_key.fee_tier.fee.into())
                .update(pool_key.fee_tier.tick_spacing.into())
                .finalize()
        }

        /// Hash (pool_hash, tick) for tick storage
        fn _hash_tick_key(self: @ContractState, pool_hash: felt252, tick: i32) -> felt252 {
            PoseidonTrait::new().update(pool_hash).update(tick.into()).finalize()
        }

        /// Hash (pool_hash, word_pos) for tick bitmap storage
        fn _hash_bitmap_key(self: @ContractState, pool_hash: felt252, word_pos: i32) -> felt252 {
            PoseidonTrait::new().update(pool_hash).update(word_pos.into()).finalize()
        }

        /// Hash (pool_hash, owner, tick_lower, tick_upper) for position storage
        fn _hash_position_key(
            self: @ContractState,
            pool_hash: felt252,
            owner: ContractAddress,
            tick_lower: i32,
            tick_upper: i32,
        ) -> felt252 {
            let owner_felt: felt252 = owner.into();
            PoseidonTrait::new()
                .update(pool_hash)
                .update(owner_felt)
                .update(tick_lower.into())
                .update(tick_upper.into())
                .finalize()
        }

        // ================================================================
        // ASSERTION HELPERS
        // ================================================================

        fn _assert_pool_initialized(self: @ContractState, pool_hash: felt252) {
            assert(self.pool_initialized.read(pool_hash), Errors::POOL_NOT_INITIALIZED);
        }

        fn _assert_admin(self: @ContractState) {
            assert(get_caller_address() == self.admin.read(), Errors::ONLY_ADMIN);
        }

        // ================================================================
        // FEE GROWTH CALCULATION
        // ================================================================

        /// Calculate fee growth inside a position's tick range
        fn _get_fee_growth_inside(
            self: @ContractState,
            pool_hash: felt252,
            pool_state: PoolState,
            tick_lower: i32,
            tick_upper: i32,
        ) -> (u256, u256) {
            let tick_lower_key = self._hash_tick_key(pool_hash, tick_lower);
            let tick_upper_key = self._hash_tick_key(pool_hash, tick_upper);

            let lower_info = self.ticks.read(tick_lower_key);
            let upper_info = self.ticks.read(tick_upper_key);

            get_fee_growth_inside(
                tick_lower,
                tick_upper,
                pool_state.tick,
                pool_state.fee_growth_global_0,
                pool_state.fee_growth_global_1,
                lower_info.fee_growth_outside_0,
                lower_info.fee_growth_outside_1,
                upper_info.fee_growth_outside_0,
                upper_info.fee_growth_outside_1,
            )
        }

        // ================================================================
        // TICK + BITMAP MANAGEMENT
        // ================================================================

        /// Update ticks and tick bitmap for a position change
        fn _update_ticks_for_position(
            ref self: ContractState,
            pool_hash: felt252,
            pool_state: PoolState,
            tick_lower: i32,
            tick_upper: i32,
            liquidity_delta: i128,
            tick_spacing: u32,
        ) {
            // Update lower tick
            let tick_lower_key = self._hash_tick_key(pool_hash, tick_lower);
            let mut lower_info = self.ticks.read(tick_lower_key);
            let was_initialized_lower = lower_info.initialized;

            lower_info =
                update_tick(
                    lower_info,
                    liquidity_delta,
                    tick_lower,
                    pool_state.tick,
                    pool_state.fee_growth_global_0,
                    pool_state.fee_growth_global_1,
                    false, // lower tick
                );

            // Flip bitmap if initialization state changed
            if was_initialized_lower != lower_info.initialized {
                self._flip_tick_in_bitmap(pool_hash, tick_lower, tick_spacing);
            }

            self.ticks.write(tick_lower_key, lower_info);

            // Update upper tick
            let tick_upper_key = self._hash_tick_key(pool_hash, tick_upper);
            let mut upper_info = self.ticks.read(tick_upper_key);
            let was_initialized_upper = upper_info.initialized;

            upper_info =
                update_tick(
                    upper_info,
                    liquidity_delta,
                    tick_upper,
                    pool_state.tick,
                    pool_state.fee_growth_global_0,
                    pool_state.fee_growth_global_1,
                    true, // upper tick
                );

            if was_initialized_upper != upper_info.initialized {
                self._flip_tick_in_bitmap(pool_hash, tick_upper, tick_spacing);
            }

            self.ticks.write(tick_upper_key, upper_info);
        }

        /// Flip a tick's bit in the bitmap
        fn _flip_tick_in_bitmap(
            ref self: ContractState, pool_hash: felt252, tick: i32, tick_spacing: u32,
        ) {
            let tick_spacing_i32: i32 = tick_spacing.try_into().unwrap();
            let compressed = tick / tick_spacing_i32;
            let (word_pos, bit_pos) = tick_position(compressed);
            let bitmap_key = self._hash_bitmap_key(pool_hash, word_pos);
            let current_word = self.tick_bitmaps.read(bitmap_key);
            let new_word = flip_bit(current_word, bit_pos);
            self.tick_bitmaps.write(bitmap_key, new_word);
        }

        // ================================================================
        // SWAP ENGINE
        // ================================================================

        /// Core swap loop. Returns:
        /// (amount_in_total, amount_out_total, final_sqrt_price, final_tick,
        ///  final_liquidity, fee_growth_0, fee_growth_1, protocol_fees_0, protocol_fees_1)
        fn _execute_swap_loop(
            ref self: ContractState,
            pool_hash: felt252,
            pool_state: PoolState,
            fee_tier: crate::clmm::fees::FeeTier,
            zero_for_one: bool,
            amount_specified: u256,
            sqrt_price_limit: u256,
        ) -> (u256, u256, u256, i32, u128, u256, u256, u128, u128) {
            let mut amount_remaining = amount_specified;
            let mut amount_calculated: u256 = 0;
            let mut current_sqrt_price = pool_state.sqrt_price;
            let mut current_tick = pool_state.tick;
            let mut current_liquidity = pool_state.liquidity;
            let mut fee_growth_global_0 = pool_state.fee_growth_global_0;
            let mut fee_growth_global_1 = pool_state.fee_growth_global_1;
            let mut protocol_fees_0 = pool_state.protocol_fees_0;
            let mut protocol_fees_1 = pool_state.protocol_fees_1;
            let protocol_fee_fraction = self.protocol_fee.read();
            let tick_spacing = fee_tier.tick_spacing;
            let fee = fee_tier.fee;

            let mut iterations: u32 = 0;
            loop {
                if amount_remaining == 0 || current_sqrt_price == sqrt_price_limit {
                    break;
                }
                assert(iterations < MAX_SWAP_LOOPS, Errors::SWAP_LOOP_LIMIT);

                // Find the next initialized tick from the bitmap
                let compressed = if zero_for_one {
                    align_tick_down(current_tick - 1, tick_spacing)
                } else {
                    align_tick_up(current_tick, tick_spacing)
                };
                let tick_spacing_i32: i32 = tick_spacing.try_into().unwrap();
                let (word_pos, _) = tick_position(compressed / tick_spacing_i32);
                let bitmap_key = self._hash_bitmap_key(pool_hash, word_pos);
                let bitmap_word = self.tick_bitmaps.read(bitmap_key);

                let (next_tick, _initialized) = crate::clmm::swap::get_next_tick(
                    current_tick, tick_spacing, zero_for_one, bitmap_word,
                );

                // Clamp to bounds
                let next_tick_clamped = if next_tick < MIN_TICK {
                    MIN_TICK
                } else if next_tick > MAX_TICK {
                    MAX_TICK
                } else {
                    next_tick
                };

                let sqrt_price_next_tick = get_sqrt_price_at_tick(next_tick_clamped);

                // Determine target: closer of next tick price or limit price
                let sqrt_price_target = if zero_for_one {
                    if sqrt_price_next_tick < sqrt_price_limit {
                        sqrt_price_limit
                    } else {
                        sqrt_price_next_tick
                    }
                } else {
                    if sqrt_price_next_tick > sqrt_price_limit {
                        sqrt_price_limit
                    } else {
                        sqrt_price_next_tick
                    }
                };

                // Skip step if no liquidity
                if current_liquidity == 0 {
                    current_sqrt_price = sqrt_price_target;
                    current_tick =
                        if zero_for_one {
                            next_tick_clamped - 1
                        } else {
                            next_tick_clamped
                        };
                    iterations += 1;
                    continue;
                }

                // Compute swap step
                let (sqrt_price_after, amount_in, amount_out, fee_amount) = compute_swap_step(
                    current_sqrt_price,
                    sqrt_price_target,
                    current_liquidity,
                    amount_remaining,
                    fee,
                    zero_for_one,
                );

                // Update remaining and calculated amounts (exact input mode)
                amount_remaining -= (amount_in + fee_amount);
                amount_calculated += amount_out;

                // Accrue fees with current liquidity (before tick crossing)
                let protocol_fee_amount = calculate_protocol_fee(fee_amount, protocol_fee_fraction);
                let lp_fee_amount = fee_amount - protocol_fee_amount;

                if zero_for_one {
                    fee_growth_global_0 =
                        update_fee_growth(fee_growth_global_0, lp_fee_amount, current_liquidity);
                    protocol_fees_0 += protocol_fee_amount.try_into().expect('fee overflow');
                } else {
                    fee_growth_global_1 =
                        update_fee_growth(fee_growth_global_1, lp_fee_amount, current_liquidity);
                    protocol_fees_1 += protocol_fee_amount.try_into().expect('fee overflow');
                }

                current_sqrt_price = sqrt_price_after;

                // Check if we reached the tick boundary
                if current_sqrt_price == sqrt_price_next_tick {
                    // Read and cross tick
                    let tick_key = self._hash_tick_key(pool_hash, next_tick_clamped);
                    let tick_info = self.ticks.read(tick_key);

                    if tick_info.initialized {
                        let (updated_tick_info, liquidity_net) = cross_tick(
                            tick_info, fee_growth_global_0, fee_growth_global_1,
                        );
                        self.ticks.write(tick_key, updated_tick_info);

                        // Apply liquidity change from tick crossing
                        if zero_for_one {
                            // Moving down: negate liquidity_net
                            if liquidity_net < 0 {
                                let delta: u128 = (liquidity_net * -1).try_into().unwrap();
                                current_liquidity += delta;
                            } else {
                                let delta: u128 = liquidity_net.try_into().unwrap();
                                current_liquidity -= delta;
                            }
                        } else {
                            // Moving up: apply liquidity_net directly
                            if liquidity_net < 0 {
                                let delta: u128 = (liquidity_net * -1).try_into().unwrap();
                                current_liquidity -= delta;
                            } else {
                                let delta: u128 = liquidity_net.try_into().unwrap();
                                current_liquidity += delta;
                            }
                        }
                    }

                    current_tick =
                        if zero_for_one {
                            next_tick_clamped - 1
                        } else {
                            next_tick_clamped
                        };
                } else {
                    current_tick = get_tick_at_sqrt_price(current_sqrt_price);
                }

                iterations += 1;
            };

            let amount_in_total = amount_specified - amount_remaining;

            (
                amount_in_total,
                amount_calculated,
                current_sqrt_price,
                current_tick,
                current_liquidity,
                fee_growth_global_0,
                fee_growth_global_1,
                protocol_fees_0,
                protocol_fees_1,
            )
        }
    }
}
