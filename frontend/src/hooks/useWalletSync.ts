import { useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useWalletStore } from "@/stores/walletStore";

/**
 * Syncs starknet-react wallet state into Zustand store.
 * Must be rendered inside StarknetConfig.
 */
export function useWalletSync() {
  const { address, isConnected } = useAccount();
  const { setWallet, clearWallet } = useWalletStore();

  useEffect(() => {
    if (isConnected && address) {
      setWallet(address);
    } else {
      clearWallet();
    }
  }, [isConnected, address, setWallet, clearWallet]);
}
