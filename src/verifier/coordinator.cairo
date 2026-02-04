/// Zylith Verifier Coordinator Contract
///
/// Central contract managing all proof verifications and state updates.
///
/// ## Responsibilities
/// 1. Route proofs to appropriate circuit verifiers
/// 2. Manage nullifier spent set (double-spend prevention)
/// 3. Update Merkle tree with new commitments
/// 4. Validate roots against known history
/// 5. Emit events for off-chain indexing
///
/// ## Architecture
/// ```
///                    Coordinator
///                         |
///     +------+------+-----+-----+
///     |      |      |           |
///   Memb.  Swap   Mint        Burn
///   Verif. Verif. Verif.     Verif.
/// ```
///
/// ## State
/// - Nullifiers: LegacyMap<felt252, bool>
/// - Merkle Tree: filled_subtrees, roots (circular buffer), next_index
/// - Verifier addresses: 4 contract addresses
///
/// ## Security
/// - Nullifiers marked AFTER successful verification
/// - Atomic state updates
/// - Admin-controlled pause functionality

use super::types::{
    Groth16Proof, MembershipPublicInputs, SwapPublicInputs, MintPublicInputs, BurnPublicInputs,
    Errors,
    membership_inputs_to_array, swap_inputs_to_array, mint_inputs_to_array, burn_inputs_to_array,
    is_valid,
};

#[starknet::contract]
pub mod VerifierCoordinator {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        StorageMapReadAccess, StorageMapWriteAccess, Map,
    };
    use super::{
        Groth16Proof, MembershipPublicInputs, SwapPublicInputs, MintPublicInputs, BurnPublicInputs,
        Errors,
        membership_inputs_to_array, swap_inputs_to_array, mint_inputs_to_array, burn_inputs_to_array,
        is_valid,
    };
    use crate::interfaces::coordinator::IVerifierCoordinator;
    use crate::interfaces::verifier::{IVerifierDispatcher, IVerifierDispatcherTrait};
    use crate::privacy::merkle::{
        TREE_HEIGHT, ROOT_HISTORY_SIZE, MAX_LEAVES, hash_left_right, get_zero_value,
    };

    // ========================================================================
    // STORAGE
    // ========================================================================

    #[storage]
    struct Storage {
        // Verifier contract addresses
        membership_verifier: ContractAddress,
        swap_verifier: ContractAddress,
        mint_verifier: ContractAddress,
        burn_verifier: ContractAddress,
        // Nullifier tracking: nullifier_hash => is_spent
        nullifiers: Map<felt252, bool>,
        // Merkle tree state
        filled_subtrees: Map<u32, felt252>, // level => rightmost filled node
        roots: Map<u32, felt252>, // circular buffer of roots
        current_root_index: u32,
        next_leaf_index: u32,
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
        #[key]
        pub nullifier_hash: felt252,
        pub root: felt252,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SwapVerified {
        #[key]
        pub nullifier_hash: felt252,
        pub new_commitment: felt252,
        pub change_commitment: felt252,
        pub token_in: ContractAddress,
        pub token_out: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MintVerified {
        #[key]
        pub nullifier_hash0: felt252,
        pub nullifier_hash1: felt252,
        pub position_commitment: felt252,
        pub tick_lower: u32,
        pub tick_upper: u32,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BurnVerified {
        #[key]
        pub position_nullifier_hash: felt252,
        pub new_commitment0: felt252,
        pub new_commitment1: felt252,
        pub tick_lower: u32,
        pub tick_upper: u32,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CommitmentAdded {
        #[key]
        pub commitment: felt252,
        pub leaf_index: u32,
        pub new_root: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct NullifierSpent {
        #[key]
        pub nullifier_hash: felt252,
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
        // Store admin and verifier addresses
        self.admin.write(admin);
        self.membership_verifier.write(membership_verifier);
        self.swap_verifier.write(swap_verifier);
        self.mint_verifier.write(mint_verifier);
        self.burn_verifier.write(burn_verifier);

        // Initialize state
        self.paused.write(false);
        self.initialized.write(true);

        // Initialize Merkle tree
        self._initialize_tree();
    }

    // ========================================================================
    // COORDINATOR IMPLEMENTATION
    // ========================================================================

    #[abi(embed_v0)]
    impl CoordinatorImpl of IVerifierCoordinator<ContractState> {
        fn verify_membership(
            ref self: ContractState, proof: Groth16Proof, public_inputs: MembershipPublicInputs,
        ) -> bool {
            // Pre-checks
            self._assert_not_paused();
            self._assert_known_root(public_inputs.root);
            self._assert_nullifier_not_spent(public_inputs.nullifier_hash);

            // Convert inputs to array and call verifier
            let inputs_array = membership_inputs_to_array(public_inputs);
            let verifier = IVerifierDispatcher {
                contract_address: self.membership_verifier.read(),
            };

            let result = verifier.verify_proof(proof, inputs_array.span());

            if !is_valid(result) {
                return false;
            }

            // Mark nullifier as spent
            self._mark_nullifier_spent(public_inputs.nullifier_hash);

            // Emit events
            self.emit(MembershipVerified {
                nullifier_hash: public_inputs.nullifier_hash,
                root: public_inputs.root,
                timestamp: get_block_timestamp(),
            });

            true
        }

        fn verify_swap(
            ref self: ContractState,
            proof: Groth16Proof,
            public_inputs: SwapPublicInputs,
            change_commitment: felt252,
        ) -> bool {
            // Pre-checks
            self._assert_not_paused();
            self._assert_known_root(public_inputs.root);
            self._assert_nullifier_not_spent(public_inputs.nullifier_hash);

            // Call verifier
            let inputs_array = swap_inputs_to_array(public_inputs);
            let verifier = IVerifierDispatcher {
                contract_address: self.swap_verifier.read(),
            };

            let result = verifier.verify_proof(proof, inputs_array.span());

            if !is_valid(result) {
                return false;
            }

            // Mark nullifier as spent
            self._mark_nullifier_spent(public_inputs.nullifier_hash);

            // Insert new commitments to Merkle tree
            self._insert_commitment(public_inputs.new_commitment);
            self._insert_commitment(change_commitment);

            // Emit events
            self.emit(SwapVerified {
                nullifier_hash: public_inputs.nullifier_hash,
                new_commitment: public_inputs.new_commitment,
                change_commitment,
                token_in: public_inputs.token_in,
                token_out: public_inputs.token_out,
                timestamp: get_block_timestamp(),
            });

            true
        }

        fn verify_mint(
            ref self: ContractState,
            proof: Groth16Proof,
            public_inputs: MintPublicInputs,
            change_commitment0: felt252,
            change_commitment1: felt252,
        ) -> bool {
            // Pre-checks
            self._assert_not_paused();
            self._assert_known_root(public_inputs.root);
            self._assert_nullifier_not_spent(public_inputs.nullifier_hash0);
            self._assert_nullifier_not_spent(public_inputs.nullifier_hash1);

            // Verify tick range
            assert(public_inputs.tick_lower < public_inputs.tick_upper, Errors::INVALID_TICK_RANGE);

            // Call verifier
            let inputs_array = mint_inputs_to_array(public_inputs);
            let verifier = IVerifierDispatcher {
                contract_address: self.mint_verifier.read(),
            };

            let result = verifier.verify_proof(proof, inputs_array.span());

            if !is_valid(result) {
                return false;
            }

            // Mark nullifiers as spent
            self._mark_nullifier_spent(public_inputs.nullifier_hash0);
            self._mark_nullifier_spent(public_inputs.nullifier_hash1);

            // Insert commitments to Merkle tree
            self._insert_commitment(public_inputs.position_commitment);
            self._insert_commitment(change_commitment0);
            self._insert_commitment(change_commitment1);

            // Emit events
            self.emit(MintVerified {
                nullifier_hash0: public_inputs.nullifier_hash0,
                nullifier_hash1: public_inputs.nullifier_hash1,
                position_commitment: public_inputs.position_commitment,
                tick_lower: public_inputs.tick_lower,
                tick_upper: public_inputs.tick_upper,
                timestamp: get_block_timestamp(),
            });

            true
        }

        fn verify_burn(
            ref self: ContractState, proof: Groth16Proof, public_inputs: BurnPublicInputs,
        ) -> bool {
            // Pre-checks
            self._assert_not_paused();
            self._assert_known_root(public_inputs.root);
            self._assert_nullifier_not_spent(public_inputs.position_nullifier_hash);

            // Verify tick range
            assert(public_inputs.tick_lower < public_inputs.tick_upper, Errors::INVALID_TICK_RANGE);

            // Call verifier
            let inputs_array = burn_inputs_to_array(public_inputs);
            let verifier = IVerifierDispatcher {
                contract_address: self.burn_verifier.read(),
            };

            let result = verifier.verify_proof(proof, inputs_array.span());

            if !is_valid(result) {
                return false;
            }

            // Mark position nullifier as spent
            self._mark_nullifier_spent(public_inputs.position_nullifier_hash);

            // Insert output commitments to Merkle tree
            self._insert_commitment(public_inputs.new_commitment0);
            self._insert_commitment(public_inputs.new_commitment1);

            // Emit events
            self.emit(BurnVerified {
                position_nullifier_hash: public_inputs.position_nullifier_hash,
                new_commitment0: public_inputs.new_commitment0,
                new_commitment1: public_inputs.new_commitment1,
                tick_lower: public_inputs.tick_lower,
                tick_upper: public_inputs.tick_upper,
                timestamp: get_block_timestamp(),
            });

            true
        }

        // ====================================================================
        // STATE QUERY FUNCTIONS
        // ====================================================================

        fn is_nullifier_spent(self: @ContractState, nullifier_hash: felt252) -> bool {
            self.nullifiers.read(nullifier_hash)
        }

        fn get_merkle_root(self: @ContractState) -> felt252 {
            let index = self.current_root_index.read();
            self.roots.read(index)
        }

        fn is_known_root(self: @ContractState, root: felt252) -> bool {
            self._is_known_root(root)
        }

        fn get_next_leaf_index(self: @ContractState) -> u32 {
            self.next_leaf_index.read()
        }

        // ====================================================================
        // ADMIN FUNCTIONS
        // ====================================================================

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
            // Initialize filled_subtrees with zero values
            let mut level: u32 = 0;
            loop {
                if level > TREE_HEIGHT {
                    break;
                }
                self.filled_subtrees.write(level, get_zero_value(level));
                level += 1;
            };

            // Set initial root (empty tree root)
            let empty_root = get_zero_value(TREE_HEIGHT);
            self.roots.write(0, empty_root);
            self.current_root_index.write(0);
            self.next_leaf_index.write(0);
        }

        /// Check if root is in the history
        fn _is_known_root(self: @ContractState, root: felt252) -> bool {
            if root == 0 {
                return false;
            }

            let current_index = self.current_root_index.read();

            // Check last ROOT_HISTORY_SIZE roots
            let mut i: u32 = 0;
            loop {
                if i >= ROOT_HISTORY_SIZE {
                    break;
                }

                // Calculate index in circular buffer
                let check_index = if current_index >= i {
                    current_index - i
                } else {
                    ROOT_HISTORY_SIZE - 1 - (i - current_index - 1)
                };

                let stored_root = self.roots.read(check_index);
                if stored_root == root {
                    return true;
                }

                // Stop if we've checked all inserted roots
                if stored_root == 0 {
                    break;
                }

                i += 1;
            };

            false
        }

        /// Insert a commitment into the Merkle tree
        fn _insert_commitment(ref self: ContractState, commitment: felt252) {
            let leaf_index = self.next_leaf_index.read();
            assert(leaf_index < MAX_LEAVES, 'Merkle tree is full');

            let mut current_hash = commitment;
            let mut current_index = leaf_index;
            let mut level: u32 = 0;

            // Compute path to root
            loop {
                if level >= TREE_HEIGHT {
                    break;
                }

                // Get sibling
                let sibling = if current_index % 2 == 0 {
                    // We're a left child, sibling is zero value
                    get_zero_value(level)
                } else {
                    // We're a right child, sibling is the filled subtree
                    self.filled_subtrees.read(level)
                };

                // Determine left/right ordering
                let (left, right) = if current_index % 2 == 0 {
                    (current_hash, sibling)
                } else {
                    (sibling, current_hash)
                };

                // Hash to get parent
                current_hash = hash_left_right(left, right);

                // Update filled_subtrees if we're a left child
                if current_index % 2 == 0 {
                    self.filled_subtrees.write(level, current_hash);
                }

                current_index = current_index / 2;
                level += 1;
            };

            // Update root (circular buffer)
            let new_root_index = (self.current_root_index.read() + 1) % ROOT_HISTORY_SIZE;
            self.roots.write(new_root_index, current_hash);
            self.current_root_index.write(new_root_index);

            // Increment leaf index
            self.next_leaf_index.write(leaf_index + 1);

            // Emit event
            self.emit(CommitmentAdded {
                commitment,
                leaf_index,
                new_root: current_hash,
            });
        }

        /// Mark nullifier as spent
        fn _mark_nullifier_spent(ref self: ContractState, nullifier_hash: felt252) {
            self.nullifiers.write(nullifier_hash, true);
            self.emit(NullifierSpent { nullifier_hash });
        }

        // ====================================================================
        // ASSERTION HELPERS
        // ====================================================================

        fn _assert_not_paused(self: @ContractState) {
            assert(!self.paused.read(), Errors::CONTRACT_PAUSED);
        }

        fn _assert_known_root(self: @ContractState, root: felt252) {
            assert(self._is_known_root(root), Errors::UNKNOWN_ROOT);
        }

        fn _assert_nullifier_not_spent(self: @ContractState, nullifier_hash: felt252) {
            assert(!self.nullifiers.read(nullifier_hash), Errors::NULLIFIER_SPENT);
        }

        fn _assert_admin(self: @ContractState) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
        }
    }
}
