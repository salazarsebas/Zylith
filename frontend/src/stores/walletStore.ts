import { create } from "zustand";

interface WalletState {
  address: string | undefined;
  isConnected: boolean;
  setWallet: (address: string) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: undefined,
  isConnected: false,
  setWallet: (address) => set({ address, isConnected: true }),
  clearWallet: () => set({ address: undefined, isConnected: false }),
}));
