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
  pool: "0x01891303f5499ebb10eda15c9f6f2f6ea71c0621b39a7e602de4b3ac5967e962",
  coordinator:
    "0x0001206be4dd7619067e1c4dfc60e71b2dd865cec387efdafac4cdfbb1c4f807",
  verifiers: {
    membership:
      "0x0670040a9193dcff93187ad9650723826ccfe0ddbc8be0ce53d07b16aab99ee4",
    swap: "0x069aff5a6f17261b76557bad0b08e10aa78f5d610145e1ecec4537069819c925",
    mint: "0x061c03854d65b64c62e2f75d0bc508daea1e05ad304612af0495635227cc0c55",
    burn: "0x01860fa496f51ba963546504a859ac1565b26e9318889bf9b926a83454104ea8",
  },
};

export { POOL_ABI } from "./abis/pool.js";
export { COORDINATOR_ABI } from "./abis/coordinator.js";
