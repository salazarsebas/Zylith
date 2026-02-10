import { type ReactNode } from "react";
import { sepolia } from "@starknet-react/chains";
import { StarknetConfig, publicProvider, argent, braavos } from "@starknet-react/core";

const connectors = [argent(), braavos()];
const chains = [sepolia];

export function StarknetProvider({ children }: { children: ReactNode }) {
  return (
    <StarknetConfig
      chains={chains}
      provider={publicProvider()}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
