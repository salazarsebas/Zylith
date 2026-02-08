#[starknet::contract]
pub mod MockERC20 {
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use core::poseidon::PoseidonTrait;
    use core::hash::HashStateTrait;
    use crate::interfaces::erc20::IERC20;

    #[storage]
    struct Storage {
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<felt252, u256>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_supply: u256, recipient: ContractAddress) {
        self.total_supply.write(initial_supply);
        self.balances.write(recipient, initial_supply);
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _allowance_key(owner: ContractAddress, spender: ContractAddress) -> felt252 {
            PoseidonTrait::new().update(owner.into()).update(spender.into()).finalize()
        }
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of IERC20<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            "MockToken"
        }

        fn symbol(self: @ContractState) -> ByteArray {
            "MTK"
        }

        fn decimals(self: @ContractState) -> u8 {
            18
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress,
        ) -> u256 {
            let key = InternalImpl::_allowance_key(owner, spender);
            self.allowances.read(key)
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');
            self.balances.write(sender, sender_balance - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let caller = get_caller_address();
            let key = InternalImpl::_allowance_key(sender, caller);
            let current_allowance = self.allowances.read(key);
            assert(current_allowance >= amount, 'Insufficient allowance');
            self.allowances.write(key, current_allowance - amount);

            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');
            self.balances.write(sender, sender_balance - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let key = InternalImpl::_allowance_key(caller, spender);
            self.allowances.write(key, amount);
            true
        }
    }
}
