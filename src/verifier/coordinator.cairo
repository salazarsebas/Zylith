/// Zylith Verifier Coordinator Contract
///
/// Central contract managing all proof verifications and state updates.
/// Routes proofs to Garaga-generated verifier contracts and processes results.
///
/// ## Architecture
/// ```
///                    Coordinator
///                         |
///     +------+------+-----+-----+
///     |      |      |           |
///   Memb.  Swap   Mint        Burn
///   (Garaga verifier contracts)
/// ```
///
/// ## Verification Flow
/// 1. User generates `full_proof_with_hints` via `garaga calldata`
/// 2. Coordinator dispatches to appropriate Garaga verifier
/// 3. Garaga verifier returns `Ok(public_inputs)` as `Span<u256>`
/// 4. Coordinator extracts and validates public inputs
/// 5. Coordinator updates state (nullifiers, Merkle tree, events)

use super::types::{
    BurnPublicInputs, Errors, MembershipPublicInputs, MintPublicInputs, SwapPublicInputs,
    extract_burn_inputs, extract_membership_inputs, extract_mint_inputs, extract_swap_inputs,
};

#[starknet::contract]
pub mod VerifierCoordinator {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use core::num::traits::Zero;
    use crate::interfaces::coordinator::IVerifierCoordinator;
    use crate::interfaces::verifier::{
        IGroth16VerifierBN254Dispatcher, IGroth16VerifierBN254DispatcherTrait,
    };
    use crate::types::{Tick, TickTrait};
    use crate::privacy::merkle::{
        MAX_LEAVES, ROOT_HISTORY_SIZE, TREE_HEIGHT, get_zero_value, hash_left_right,
    };
    use super::{
        BurnPublicInputs, Errors, MembershipPublicInputs, MintPublicInputs, SwapPublicInputs,
        extract_burn_inputs, extract_membership_inputs, extract_mint_inputs, extract_swap_inputs,
    };

    // ========================================================================
    // STORAGE
    // ========================================================================

    #[storage]
    struct Storage {
        // Garaga verifier contract addresses
        membership_verifier: ContractAddress,
        swap_verifier: ContractAddress,
        mint_verifier: ContractAddress,
        burn_verifier: ContractAddress,
        // Nullifier tracking: nullifier_hash => is_spent (u256 for BN254 field elements)
        nullifiers: Map<u256, bool>,
        // Merkle tree state (Stark-field Poseidon, used for internal incremental tree)
        filled_subtrees: Map<u32, felt252>,
        // Root history (u256 for BN254 Poseidon roots submitted via submit_merkle_root)
        roots: Map<u32, u256>,
        current_root_index: u32,
        next_leaf_index: u32,
        // Commitment storage (u256 for BN254 field elements)
        commitments: Map<u32, u256>,
        // Admin and state
        admin: ContractAddress,
        paused: bool,
        initialized: bool,
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        MembershipVerified: MembershipVerified,
        SwapVerified: SwapVerified,
        MintVerified: MintVerified,
        BurnVerified: BurnVerified,
        CommitmentAdded: CommitmentAdded,
        NullifierSpent: NullifierSpent,
        Paused: Paused,
        Unpaused: Unpaused,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MembershipVerified {
        pub nullifier_hash: u256,
        pub root: u256,
        pub recipient: ContractAddress,
        pub amount_low: u128,
        pub amount_high: u128,
        pub token: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SwapVerified {
        pub nullifier_hash: u256,
        pub new_commitment: u256,
        pub change_commitment: u256,
        pub token_in: ContractAddress,
        pub token_out: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MintVerified {
        pub nullifier_hash0: u256,
        pub nullifier_hash1: u256,
        pub position_commitment: u256,
        pub tick_lower: Tick,
        pub tick_upper: Tick,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BurnVerified {
        pub position_nullifier_hash: u256,
        pub new_commitment0: u256,
        pub new_commitment1: u256,
        pub tick_lower: Tick,
        pub tick_upper: Tick,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CommitmentAdded {
        pub commitment: u256,
        pub leaf_index: u32,
        pub new_root: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct NullifierSpent {
        pub nullifier_hash: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Paused {
        pub by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Unpaused {
        pub by: ContractAddress,
    }

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        membership_verifier: ContractAddress,
        swap_verifier: ContractAddress,
        mint_verifier: ContractAddress,
        burn_verifier: ContractAddress,
    ) {
        self.admin.write(admin);
        self.membership_verifier.write(membership_verifier);
        self.swap_verifier.write(swap_verifier);
        self.mint_verifier.write(mint_verifier);
        self.burn_verifier.write(burn_verifier);

        self.paused.write(false);
        self.initialized.write(true);

        self._initialize_tree();
    }

    // ========================================================================
    // COORDINATOR IMPLEMENTATION
    // ========================================================================

    #[abi(embed_v0)]
    impl CoordinatorImpl of IVerifierCoordinator<ContractState> {
        fn verify_membership(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> MembershipPublicInputs {
            self._assert_not_paused();

            // Call Garaga verifier
            let verifier = IGroth16VerifierBN254Dispatcher {
                contract_address: self.membership_verifier.read(),
            };
            let result = verifier.verify_groth16_proof_bn254(full_proof_with_hints);

            // Extract public inputs from verified proof
            let public_inputs_raw = result.expect(Errors::INVALID_PROOF);
            let pi = extract_membership_inputs(public_inputs_raw);

            // Validate state
            self._assert_known_root(pi.root);
            self._assert_nullifier_not_spent(pi.nullifier_hash);

            // Validate withdrawal parameters
            assert(!pi.recipient.is_zero(), 'Invalid recipient');
            assert(!pi.token.is_zero(), 'Invalid token');
            assert(pi.amount_low != 0 || pi.amount_high != 0, 'Invalid amount');

            // Update state
            self._mark_nullifier_spent(pi.nullifier_hash);

            // Emit events
            self
                .emit(
                    MembershipVerified {
                        nullifier_hash: pi.nullifier_hash,
                        root: pi.root,
                        recipient: pi.recipient,
                        amount_low: pi.amount_low,
                        amount_high: pi.amount_high,
                        token: pi.token,
                        timestamp: get_block_timestamp(),
                    },
                );

            pi
        }

        fn verify_swap(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> SwapPublicInputs {
            self._assert_not_paused();

            // Call Garaga verifier
            let verifier = IGroth16VerifierBN254Dispatcher {
                contract_address: self.swap_verifier.read(),
            };
            let result = verifier.verify_groth16_proof_bn254(full_proof_with_hints);

            // Extract public inputs from verified proof
            let public_inputs_raw = result.expect(Errors::INVALID_PROOF);
            let pi = extract_swap_inputs(public_inputs_raw);

            // Validate state
            self._assert_known_root(pi.root);
            self._assert_nullifier_not_spent(pi.nullifier_hash);

            // Update state
            self._mark_nullifier_spent(pi.nullifier_hash);
            self._insert_commitment(pi.new_commitment);
            self._insert_commitment(pi.change_commitment);

            // Emit events
            self
                .emit(
                    SwapVerified {
                        nullifier_hash: pi.nullifier_hash,
                        new_commitment: pi.new_commitment,
                        change_commitment: pi.change_commitment,
                        token_in: pi.token_in,
                        token_out: pi.token_out,
                        timestamp: get_block_timestamp(),
                    },
                );

            pi
        }

        fn verify_mint(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> MintPublicInputs {
            self._assert_not_paused();

            // Call Garaga verifier
            let verifier = IGroth16VerifierBN254Dispatcher {
                contract_address: self.mint_verifier.read(),
            };
            let result = verifier.verify_groth16_proof_bn254(full_proof_with_hints);

            // Extract public inputs from verified proof
            let public_inputs_raw = result.expect(Errors::INVALID_PROOF);
            let pi = extract_mint_inputs(public_inputs_raw);

            // Validate state
            self._assert_known_root(pi.root);
            self._assert_nullifier_not_spent(pi.nullifier_hash0);
            self._assert_nullifier_not_spent(pi.nullifier_hash1);
            assert(pi.tick_lower.to_i32() < pi.tick_upper.to_i32(), Errors::INVALID_TICK_RANGE);

            // Update state
            self._mark_nullifier_spent(pi.nullifier_hash0);
            self._mark_nullifier_spent(pi.nullifier_hash1);
            self._insert_commitment(pi.position_commitment);
            self._insert_commitment(pi.change_commitment0);
            self._insert_commitment(pi.change_commitment1);

            // Emit events
            self
                .emit(
                    MintVerified {
                        nullifier_hash0: pi.nullifier_hash0,
                        nullifier_hash1: pi.nullifier_hash1,
                        position_commitment: pi.position_commitment,
                        tick_lower: pi.tick_lower,
                        tick_upper: pi.tick_upper,
                        timestamp: get_block_timestamp(),
                    },
                );

            pi
        }

        fn verify_burn(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> BurnPublicInputs {
            self._assert_not_paused();

            // Call Garaga verifier
            let verifier = IGroth16VerifierBN254Dispatcher {
                contract_address: self.burn_verifier.read(),
            };
            let result = verifier.verify_groth16_proof_bn254(full_proof_with_hints);

            // Extract public inputs from verified proof
            let public_inputs_raw = result.expect(Errors::INVALID_PROOF);
            let pi = extract_burn_inputs(public_inputs_raw);

            // Validate state
            self._assert_known_root(pi.root);
            self._assert_nullifier_not_spent(pi.position_nullifier_hash);
            assert(pi.tick_lower.to_i32() < pi.tick_upper.to_i32(), Errors::INVALID_TICK_RANGE);

            // Update state
            self._mark_nullifier_spent(pi.position_nullifier_hash);
            self._insert_commitment(pi.new_commitment0);
            self._insert_commitment(pi.new_commitment1);

            // Emit events
            self
                .emit(
                    BurnVerified {
                        position_nullifier_hash: pi.position_nullifier_hash,
                        new_commitment0: pi.new_commitment0,
                        new_commitment1: pi.new_commitment1,
                        tick_lower: pi.tick_lower,
                        tick_upper: pi.tick_upper,
                        timestamp: get_block_timestamp(),
                    },
                );

            pi
        }

        // ====================================================================
        // STATE QUERY FUNCTIONS
        // ====================================================================

        fn is_nullifier_spent(self: @ContractState, nullifier_hash: u256) -> bool {
            self.nullifiers.read(nullifier_hash)
        }

        fn get_merkle_root(self: @ContractState) -> u256 {
            let index = self.current_root_index.read();
            self.roots.read(index)
        }

        fn is_known_root(self: @ContractState, root: u256) -> bool {
            self._is_known_root(root)
        }

        fn get_next_leaf_index(self: @ContractState) -> u32 {
            self.next_leaf_index.read()
        }

        // ====================================================================
        // ADMIN FUNCTIONS
        // ====================================================================

        fn deposit(ref self: ContractState, commitment: u256) {
            self._assert_admin();
            self._assert_not_paused();
            assert(commitment != 0, Errors::INVALID_COMMITMENT);

            let leaf_index = self.next_leaf_index.read();
            assert(leaf_index < MAX_LEAVES, 'Merkle tree is full');

            // Store commitment for off-chain tree reconstruction
            self.commitments.write(leaf_index, commitment);
            self.next_leaf_index.write(leaf_index + 1);

            self.emit(CommitmentAdded { commitment, leaf_index, new_root: 0 });
        }

        fn submit_merkle_root(ref self: ContractState, root: u256) {
            self._assert_admin();
            assert(root != 0, Errors::UNKNOWN_ROOT);

            let new_root_index = (self.current_root_index.read() + 1) % ROOT_HISTORY_SIZE;
            self.roots.write(new_root_index, root);
            self.current_root_index.write(new_root_index);
        }

        fn pause(ref self: ContractState) {
            self._assert_admin();
            self.paused.write(true);
            self.emit(Paused { by: get_caller_address() });
        }

        fn unpause(ref self: ContractState) {
            self._assert_admin();
            self.paused.write(false);
            self.emit(Unpaused { by: get_caller_address() });
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read()
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }
    }

    // ========================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Initialize Merkle tree with zero values
        fn _initialize_tree(ref self: ContractState) {
            let mut level: u32 = 0;
            loop {
                if level > TREE_HEIGHT {
                    break;
                }
                self.filled_subtrees.write(level, get_zero_value(level));
                level += 1;
            }

            // Initialize root history with zero (empty tree)
            self.roots.write(0, 0);
            self.current_root_index.write(0);
            self.next_leaf_index.write(0);
        }

        /// Check if root is in the history
        fn _is_known_root(self: @ContractState, root: u256) -> bool {
            if root == 0 {
                return false;
            }

            let current_index = self.current_root_index.read();

            let mut i: u32 = 0;
            loop {
                if i >= ROOT_HISTORY_SIZE {
                    break;
                }

                let check_index = if current_index >= i {
                    current_index - i
                } else {
                    ROOT_HISTORY_SIZE - 1 - (i - current_index - 1)
                };

                let stored_root = self.roots.read(check_index);
                if stored_root == root {
                    return true;
                }

                if stored_root == 0 {
                    break;
                }

                i += 1;
            }

            false
        }

        /// Insert a commitment into the Merkle tree (Stark-field incremental tree)
        /// Note: This tree uses Stark Poseidon which differs from BN128 Poseidon.
        /// The resulting root is NOT used for proof verification — roots are
        /// submitted externally via submit_merkle_root.
        fn _insert_commitment(ref self: ContractState, commitment: u256) {
            let leaf_index = self.next_leaf_index.read();
            assert(leaf_index < MAX_LEAVES, 'Merkle tree is full');

            // Store commitment for off-chain tree reconstruction
            self.commitments.write(leaf_index, commitment);

            // Update Stark-field incremental tree (for internal bookkeeping)
            // Truncate u256 to felt252 for Stark Poseidon — this tree's root
            // is not used for proof verification
            let commitment_felt: felt252 = commitment.try_into().unwrap_or(0);
            let mut current_hash = commitment_felt;
            let mut current_index = leaf_index;
            let mut level: u32 = 0;

            loop {
                if level >= TREE_HEIGHT {
                    break;
                }

                let (left, right) = if current_index % 2 == 0 {
                    self.filled_subtrees.write(level, current_hash);
                    (current_hash, get_zero_value(level))
                } else {
                    (self.filled_subtrees.read(level), current_hash)
                };

                current_hash = hash_left_right(left, right);

                current_index = current_index / 2;
                level += 1;
            };

            self.next_leaf_index.write(leaf_index + 1);

            // Note: We do NOT update roots here — the Stark Poseidon root
            // differs from the BN128 root. Roots are submitted via submit_merkle_root.
            self.emit(CommitmentAdded { commitment, leaf_index, new_root: 0 });
        }

        /// Mark nullifier as spent
        fn _mark_nullifier_spent(ref self: ContractState, nullifier_hash: u256) {
            self.nullifiers.write(nullifier_hash, true);
            self.emit(NullifierSpent { nullifier_hash });
        }

        // ====================================================================
        // ASSERTION HELPERS
        // ====================================================================

        fn _assert_not_paused(self: @ContractState) {
            assert(!self.paused.read(), Errors::CONTRACT_PAUSED);
        }

        fn _assert_known_root(self: @ContractState, root: u256) {
            assert(self._is_known_root(root), Errors::UNKNOWN_ROOT);
        }

        fn _assert_nullifier_not_spent(self: @ContractState, nullifier_hash: u256) {
            assert(!self.nullifiers.read(nullifier_hash), Errors::NULLIFIER_SPENT);
        }

        fn _assert_admin(self: @ContractState) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
        }
    }
}
