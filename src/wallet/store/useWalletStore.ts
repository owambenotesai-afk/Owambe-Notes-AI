import { create } from "zustand";
import { ethers } from "ethers";
import { Token } from "../services/tokenService";

export interface WalletState {
  hasWallet: boolean;
  isLocked: boolean;
  activeScreen: "wallet" | "swap" | "discover" | "settings";
  balance: string;
  address: string | null;
  activeTab: "tokens" | "nfts";
  selectedChainId: string;
  setHasWallet: (hasWallet: boolean) => void;
  setIsLocked: (isLocked: boolean) => void;
  setActiveScreen: (
    screen: "wallet" | "swap" | "discover" | "settings",
  ) => void;
  setBalance: (balance: string) => void;
  setAddress: (address: string | null) => void;
  setActiveTab: (tab: "tokens" | "nfts") => void;
  setSelectedChainId: (id: string) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  hasWallet: false,
  isLocked: false,
  activeScreen: "wallet",
  balance: "0.0",
  address: null,
  activeTab: "tokens",
  selectedChainId: "ethereum",
  setHasWallet: (hasWallet) => set({ hasWallet }),
  setIsLocked: (isLocked) => set({ isLocked }),
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setBalance: (balance) => set({ balance }),
  setAddress: (address) => set({ address }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedChainId: (id) => set({ selectedChainId: id }),
}));
