import { CavosProvider as CavosSDKProvider } from "@cavos/react";
import { ReactNode } from "react";

interface CavosProviderProps {
  children: ReactNode;
}

const CAVOS_APP_ID = import.meta.env.VITE_CAVOS_APP_ID;
const STARKNET_NETWORK = import.meta.env.VITE_STARKNET_NETWORK || "sepolia";

// Deployed contract addresses
const COORDINATOR_ADDRESS = "0x034a4ff6ce756bde489688e64af15ecb6803af4eb7f2c197ca6c4d922360a803";
const POOL_ADDRESS = "0x0379619ca85d2612f5a11f2b2429328f911b2c57112f66898e08ab867654f3d2";
const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const ETH_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export function CavosProvider({ children }: CavosProviderProps) {
  if (!CAVOS_APP_ID) {
    console.error("VITE_CAVOS_APP_ID is not configured");
    return <>{children}</>;
  }

  const config = {
    appId: CAVOS_APP_ID,
    network: STARKNET_NETWORK as "sepolia" | "mainnet",
    starknetRpcUrl: import.meta.env.VITE_STARKNET_RPC_URL,
    enableLogging: true,
    session: {
      defaultPolicy: {
        allowedContracts: [COORDINATOR_ADDRESS, POOL_ADDRESS, STRK_ADDRESS, ETH_ADDRESS],
        spendingLimits: [
          { token: STRK_ADDRESS, limit: 1000n * 10n ** 18n }, // 1000 STRK
          { token: ETH_ADDRESS, limit: 1000n * 10n ** 18n }, // 1000 ETH
        ],
        maxCallsPerTx: 10,
      },
    },
  };

  return (
    <CavosSDKProvider config={config}>
      {children}
    </CavosSDKProvider>
  );
}
