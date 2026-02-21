import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { getStarknet, type StarknetWindowObject } from "get-starknet-core";
import { RpcProvider, type Call } from "starknet";
import { env } from "@/config/env";

interface StarknetContextValue {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  execute: (calls: Call | Call[]) => Promise<string>;
}

const StarknetContext = createContext<StarknetContextValue | null>(null);

export function useStarknetWallet() {
  const ctx = useContext(StarknetContext);
  if (!ctx)
    throw new Error("useStarknetWallet must be used within StarknetProvider");
  return ctx;
}

const rpcProvider = new RpcProvider({
  nodeUrl:
    env.starknetRpcUrl ||
    "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/AsrWtDeOEbxi0YbQPwAjZ",
});

export function StarknetProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<StarknetWindowObject | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Try to restore last connected wallet on mount
  useEffect(() => {
    const sn = getStarknet();
    sn.getLastConnectedWallet().then(async (lastWallet) => {
      if (lastWallet) {
        try {
          const enabled = await sn.enable(lastWallet, { silent_mode: true });
          const accounts = await enabled.request({
            type: "wallet_requestAccounts",
          });
          if (accounts?.length) {
            setWallet(enabled);
            setAddress(accounts[0]);
          }
        } catch {
          // Silent restore failed
        }
      }
    });
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const sn = getStarknet();
      const available = await sn.getAvailableWallets();

      if (available.length === 0) {
        throw new Error(
          "No Starknet wallets found. Install Argent X or Braavos."
        );
      }

      // Prefer Argent, fallback to first available
      const preferred =
        available.find((w) => w.id === "argentX") ?? available[0];
      const enabled = await sn.enable(preferred);
      const accounts = await enabled.request({
        type: "wallet_requestAccounts",
      });

      if (!accounts?.length) {
        throw new Error("No accounts returned from wallet");
      }

      setWallet(enabled);
      setAddress(accounts[0]);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const sn = getStarknet();
    await sn.disconnect({ clearLastWallet: true });
    setWallet(null);
    setAddress(null);
  }, []);

  const execute = useCallback(
    async (calls: Call | Call[]) => {
      if (!wallet || !address) throw new Error("Wallet not connected");
      const callsArray = Array.isArray(calls) ? calls : [calls];

      // Convert starknet.js Call format to wallet API format
      const walletCalls = callsArray.map((c) => ({
        contract_address: c.contractAddress,
        entry_point: c.entrypoint,
        calldata: (c.calldata as string[] | undefined) ?? [],
      }));

      const result = await wallet.request({
        type: "wallet_addInvokeTransaction",
        params: { calls: walletCalls },
      });

      // Wait for confirmation
      await rpcProvider.waitForTransaction(result.transaction_hash);
      return result.transaction_hash;
    },
    [wallet, address]
  );

  // Listen for account changes
  useEffect(() => {
    if (!wallet) return;

    const handleAccountChange = (accounts?: string[]) => {
      if (accounts?.length) {
        setAddress(accounts[0]);
      } else {
        setAddress(null);
      }
    };

    wallet.on("accountsChanged", handleAccountChange);
    return () => {
      wallet.off("accountsChanged", handleAccountChange);
    };
  }, [wallet]);

  return (
    <StarknetContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        walletName: wallet?.name ?? null,
        connect,
        disconnect,
        execute,
      }}
    >
      {children}
    </StarknetContext.Provider>
  );
}
