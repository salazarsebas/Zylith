#[starknet::contract]
pub mod MockCoordinator {
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address};
    use crate::interfaces::coordinator::IVerifierCoordinator;
    use crate::types::TickTrait;
    use crate::verifier::types::{
        SwapPublicInputs, MintPublicInputs, BurnPublicInputs, TICK_OFFSET,
        offset_tick_to_signed,
    };

    #[storage]
    struct Storage {
        admin: ContractAddress,
        paused: bool,
        // Mock values for shielded ops
        mock_token_in: ContractAddress,
        mock_token_out: ContractAddress,
        mock_amount_in: u256,
        mock_amount_out_min: u256,
        mock_tick_lower: u32,
        mock_tick_upper: u32,
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    /// Mock coordinator: returns mock verified public inputs for testing.
    /// Call set_mock_swap_params / set_mock_tick_params before shielded ops.
    #[abi(embed_v0)]
    impl MockCoordinatorImpl of IVerifierCoordinator<ContractState> {
        fn verify_membership(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> bool {
            true
        }

        fn verify_swap(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> SwapPublicInputs {
            SwapPublicInputs {
                change_commitment: 0,
                root: 0,
                nullifier_hash: 0,
                new_commitment: 0,
                token_in: self.mock_token_in.read(),
                token_out: self.mock_token_out.read(),
                amount_in: self.mock_amount_in.read(),
                amount_out_min: self.mock_amount_out_min.read(),
            }
        }

        fn verify_mint(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> MintPublicInputs {
            let tick_lower_offset = self.mock_tick_lower.read();
            let tick_upper_offset = self.mock_tick_upper.read();
            MintPublicInputs {
                change_commitment0: 0,
                change_commitment1: 0,
                root: 0,
                nullifier_hash0: 0,
                nullifier_hash1: 0,
                position_commitment: 0,
                tick_lower: TickTrait::from_i32(offset_tick_to_signed(tick_lower_offset)),
                tick_upper: TickTrait::from_i32(offset_tick_to_signed(tick_upper_offset)),
            }
        }

        fn verify_burn(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> BurnPublicInputs {
            let tick_lower_offset = self.mock_tick_lower.read();
            let tick_upper_offset = self.mock_tick_upper.read();
            BurnPublicInputs {
                root: 0,
                position_nullifier_hash: 0,
                new_commitment0: 0,
                new_commitment1: 0,
                tick_lower: TickTrait::from_i32(offset_tick_to_signed(tick_lower_offset)),
                tick_upper: TickTrait::from_i32(offset_tick_to_signed(tick_upper_offset)),
            }
        }

        fn is_nullifier_spent(self: @ContractState, nullifier_hash: u256) -> bool {
            false
        }

        fn get_merkle_root(self: @ContractState) -> u256 {
            0
        }

        fn is_known_root(self: @ContractState, root: u256) -> bool {
            true
        }

        fn get_next_leaf_index(self: @ContractState) -> u32 {
            0
        }

        fn deposit(ref self: ContractState, commitment: u256) {}

        fn submit_merkle_root(ref self: ContractState, root: u256) {}

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

    /// External setters for configuring mock return values in tests
    #[generate_trait]
    #[abi(per_item)]
    impl MockSettersImpl of MockSettersTrait {
        /// Set mock swap parameters (token_in, token_out, amount_in, amount_out_min)
        #[external(v0)]
        fn set_mock_swap_params(
            ref self: ContractState,
            token_in: ContractAddress,
            token_out: ContractAddress,
            amount_in: u256,
            amount_out_min: u256,
        ) {
            self.mock_token_in.write(token_in);
            self.mock_token_out.write(token_out);
            self.mock_amount_in.write(amount_in);
            self.mock_amount_out_min.write(amount_out_min);
        }

        /// Set mock tick parameters for mint/burn (signed ticks, auto-converts to offset)
        #[external(v0)]
        fn set_mock_tick_params(ref self: ContractState, tick_lower: i32, tick_upper: i32) {
            // Convert signed ticks to unsigned offset ticks (matching Circom convention)
            let offset: i32 = TICK_OFFSET.try_into().unwrap();
            let lower_offset: u32 = (tick_lower + offset).try_into().unwrap();
            let upper_offset: u32 = (tick_upper + offset).try_into().unwrap();
            self.mock_tick_lower.write(lower_offset);
            self.mock_tick_upper.write(upper_offset);
        }
    }
}
