import { useEffect } from "react";
import { useStarknetWallet } from "@/providers/StarknetProvider";
import { useWalletStore } from "@/stores/walletStore";

/**
 * Syncs Starknet wallet state into Zustand store.
 */
export function useWalletSync() {
  const { address, isConnected } = useStarknetWallet();
  const { setWallet, clearWallet } = useWalletStore();

  useEffect(() => {
    if (isConnected && address) {
      setWallet(address);
    } else {
      clearWallet();
    }
  }, [isConnected, address, setWallet, clearWallet]);
}
