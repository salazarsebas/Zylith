#[starknet::contract]
pub mod MockCoordinator {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address};
    use crate::interfaces::coordinator::IVerifierCoordinator;

    #[storage]
    struct Storage {
        admin: ContractAddress,
        paused: bool,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    /// Mock coordinator: always returns true for all proof verifications.
    /// Used for testing pool integration without real ZK proofs.
    #[abi(embed_v0)]
    impl MockCoordinatorImpl of IVerifierCoordinator<ContractState> {
        fn verify_membership(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> bool {
            true
        }

        fn verify_swap(ref self: ContractState, full_proof_with_hints: Span<felt252>) -> bool {
            true
        }

        fn verify_mint(ref self: ContractState, full_proof_with_hints: Span<felt252>) -> bool {
            true
        }

        fn verify_burn(ref self: ContractState, full_proof_with_hints: Span<felt252>) -> bool {
            true
        }

        fn is_nullifier_spent(self: @ContractState, nullifier_hash: felt252) -> bool {
            false
        }

        fn get_merkle_root(self: @ContractState) -> felt252 {
            0
        }

        fn is_known_root(self: @ContractState, root: felt252) -> bool {
            true
        }

        fn get_next_leaf_index(self: @ContractState) -> u32 {
            0
        }

        fn pause(ref self: ContractState) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
            self.paused.write(true);
        }

        fn unpause(ref self: ContractState) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
            self.paused.write(false);
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read()
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read()
        }
    }
}
