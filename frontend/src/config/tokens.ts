export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

/**
 * Testnet token list for Starknet Sepolia.
 * These are mock ERC20s deployed alongside the Zylith contracts.
 * Update addresses after each deployment.
 */
export const TESTNET_TOKENS: Token[] = [
  {
    address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
  },
  {
    address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    symbol: "STRK",
    name: "Starknet Token",
    decimals: 18,
  },
];

export function getToken(address: string): Token | undefined {
  return TESTNET_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

export function getTokenSymbol(address: string): string {
  return getToken(address)?.symbol ?? `${address.slice(0, 6)}...${address.slice(-4)}`;
}
