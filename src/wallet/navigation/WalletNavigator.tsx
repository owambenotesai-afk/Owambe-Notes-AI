import React, { useState, useEffect } from "react";
import { SetupWallet } from "../components/SetupWallet";
import { WalletScreen } from "../screens/WalletScreen";
import { SwapScreen } from "../screens/SwapScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { BuySellScreen } from "../screens/BuySellScreen";
import { walletService } from "../services/walletService";
import { AppLock } from "../components/AppLock";
import {
  Wallet,
  SplitSquareHorizontal,
  Compass,
  Settings,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const WalletNavigator = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState("wallet");

  const checkWalletStatus = () => {
    const data = walletService.getWallet();
    const hasPin = walletService.hasWalletLockPin();

    setHasWallet(!!data);

    if (data && hasPin) {
      setIsLocked(true);
    }
  };

  useEffect(() => {
    checkWalletStatus();
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      if (hasWallet && walletService.hasWalletLockPin() && !isLocked) {
        timeout = setTimeout(() => {
          setIsLocked(true);
        }, 60000); // 1 minute auto lock
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && hasWallet && walletService.hasWalletLockPin()) {
        setIsLocked(true);
      } else {
        resetTimer();
      }
    };

    if (hasWallet && !isLocked) {
      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("touchstart", resetTimer);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      resetTimer();
    }

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasWallet, isLocked]);

  if (hasWallet === null) {
    return (
      <div className="h-full bg-[#0B0F1A] flex items-center justify-center text-emerald-400">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"
        />
      </div>
    );
  }

  // Check if wallet exists but hasn't fully set up PIN.
  if (!hasWallet || (hasWallet && !walletService.hasWalletLockPin())) {
    return (
      <div className="h-full bg-[#0B0F1A] overflow-y-auto pb-28 scrollbar-hide">
        <SetupWallet
          onComplete={() => {
            checkWalletStatus(); // Will lock upon complete, then they unlock immediately to get in
            setIsLocked(false);
          }}
        />
      </div>
    );
  }

  const tabs = [
    { id: "wallet", icon: Wallet, label: "Home" },
    { id: "swap", icon: SplitSquareHorizontal, label: "Swap" },
    { id: "buysell", icon: CreditCard, label: "Buy/Sell" },
    { id: "discover", icon: Compass, label: "Discover" },
    { id: "settings", icon: Settings, label: "Settings" },
  ] as const;

  return (
    <div className="h-full bg-[#0B0F1A] flex flex-col relative overflow-hidden text-white w-full max-w-2xl mx-auto">
      {isLocked && <AppLock onUnlock={() => setIsLocked(false)} />}

      <div className="flex-1 overflow-y-auto scrollbar-hide relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="min-h-full"
          >
            {activeTab === "wallet" && <WalletScreen />}
            {activeTab === "swap" && <SwapScreen />}
            {activeTab === "buysell" && <BuySellScreen />}
            {activeTab === "discover" && <DiscoverScreen />}
            {activeTab === "settings" && (
              <SettingsScreen onLogout={() => setIsLocked(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Pill Bottom Nav */}
      <div className="absolute flex justify-center bottom-6 left-0 right-0 z-50 pointer-events-none px-4">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-black/50 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center justify-between gap-1 shadow-2xl pointer-events-auto"
        >
          {tabs.map(({ id, icon: Icon, label }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTab(id)}
                className={`relative px-4 py-3 rounded-full flex flex-col items-center gap-1 transition-all duration-300 min-w-[72px] \${
                  isActive ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabNav"
                    className="absolute inset-0 bg-emerald-500/10 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
                <span className="text-[10px] font-bold tracking-wide relative z-10">
                  {label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="activeTabDot"
                    className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,1)]"
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
