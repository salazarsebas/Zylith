export const env = {
  starknetRpcUrl: import.meta.env.VITE_STARKNET_RPC_URL ?? "",
  aspUrl: import.meta.env.VITE_ASP_URL ?? "http://localhost:3001",
  chainId: import.meta.env.VITE_CHAIN_ID ?? "SN_SEPOLIA",
} as const;
