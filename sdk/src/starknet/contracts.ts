/** Deployed contract addresses and ABI re-exports */

export interface ContractAddresses {
  pool: string;
  coordinator: string;
  verifiers: {
    membership: string;
    swap: string;
    mint: string;
    burn: string;
  };
}

/** Starknet Sepolia deployed addresses */
export const SEPOLIA_ADDRESSES: ContractAddresses = {
  pool: "0x0499a1be042eefdcc30de5b44d93edba865c1d24d2144a7ccd03af4aa1b02782",
  coordinator:
    "0x01b5599249e90b473548b68a7ada3d48d75c7641a964b2f729595ac550339eea",
  verifiers: {
    membership:
      "0x052eea56144dc3b636ff0dc9e0a2e1468bb1e043ef1b2bed438a2a7278f7e87f",
    swap: "0x02a00a05df3752c65816a61248be60312bce4032c17fd5c711f3c41fc5253f92",
    mint: "0x030d423c00212ff44f02628e8304636ad44b9572c4754f4886381d1de87a226e",
    burn: "0x06b03f20b8348766fb81fc62dd02258ecb3149c143825af49b6f3fd4b8bdf4db",
  },
};

export { POOL_ABI } from "./abis/pool.js";
export { COORDINATOR_ABI } from "./abis/coordinator.js";
