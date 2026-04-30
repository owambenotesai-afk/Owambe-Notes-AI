import React, { useState, useEffect } from "react";
import { Lock, ShieldAlert, Fingerprint, X } from "lucide-react";
import { walletService } from "../services/walletService";
import { motion, AnimatePresence } from "framer-motion";

interface AppLockProps {
  onUnlock: () => void;
  // If set, this acts as a risk-based transaction lock rather than just a general app lock
  riskLevel?: "LOW" | "HIGH";
  isTransaction?: boolean;
  onCancel?: () => void;
  actionExplanation?: string;
}

export const AppLock = ({
  onUnlock,
  riskLevel = "LOW",
  isTransaction = false,
  onCancel,
  actionExplanation,
}: AppLockProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // Determine if this is a high-risk scenario
  const isHighRisk = riskLevel === "HIGH";

  // Simulate Biometric automatically if no risk and not a transaction specifically requesting PIN
  useEffect(() => {
    if (!isHighRisk && !isTransaction) {
      // In a real mobile app we'd trigger LocalAuthentication here
      // For web, we simulate successful faceid/fingerprint if biometric is "enabled"
      // by the user. Leaving it manual for now to show the lock screen.
    }
  }, [isHighRisk, isTransaction]);

  useEffect(() => {
    if (pin.length === 6) {
      handleUnlock();
    }
  }, [pin]);

  const handleUnlock = () => {
    if (walletService.verifyWalletLockPin(pin.trim())) {
      onUnlock();
    } else {
      setError("Incorrect PIN. Try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const triggerBiometric = () => {
    // Simulated Biometrics
    // Real implementation would use process.env to bridge to React Native/WebAuthn
    setTimeout(() => {
      onUnlock();
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-[#0B0F1A]/80 backdrop-blur-2xl flex flex-col items-center justify-center px-6 overflow-y-auto scrollbar-hide"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-sm p-8 rounded-[32px] border bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col items-center relative ${
          isHighRisk
            ? "border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
            : "border-white/10"
        }`}
      >
        {isTransaction && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-6 right-6 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 relative ${
            isHighRisk
              ? "bg-red-500/20 text-red-500"
              : "bg-emerald-500/20 text-emerald-500"
          }`}
        >
          {isHighRisk ? (
            <ShieldAlert className="w-8 h-8 relative z-10" />
          ) : (
            <Lock className="w-8 h-8 relative z-10" />
          )}
          {isHighRisk && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border border-red-500"
            />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isHighRisk
            ? "Security Verification"
            : isTransaction
              ? "Confirm Transaction"
              : "Wallet Locked"}
        </h2>

        {isHighRisk ? (
          <p className="text-red-400 mb-6 max-w-xs text-center text-sm font-medium">
            ⚠️ Suspicious activity detected. Extra verification required.
            {actionExplanation && (
              <span className="block mt-2 text-red-500 font-bold">
                {actionExplanation}
              </span>
            )}
          </p>
        ) : (
          <p className="text-gray-400 mb-8 max-w-xs text-center text-sm">
            {isTransaction
              ? "Enter your 6-digit Security PIN to sign this transaction."
              : "Enter your 6-digit Security PIN to access your wallet."}
          </p>
        )}

        <motion.div
          animate={isShaking ? { x: [-10, 10, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex gap-4 mb-4"
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < pin.length
                  ? isHighRisk
                    ? "bg-red-500 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    : "bg-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  : "bg-white/10"
              }`}
            />
          ))}
        </motion.div>

        <div className="h-6 mb-4">
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-6 mb-4 w-full max-w-[260px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              whileTap={{ scale: 0.85 }}
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-white hover:bg-white/10 transition-colors"
            >
              {num}
            </motion.button>
          ))}
          <div className="w-16 h-16 flex items-center justify-center">
            {!isHighRisk && !isTransaction && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={triggerBiometric}
                className="text-emerald-500 opacity-80 hover:opacity-100 transition-opacity flex flex-col items-center gap-1"
              >
                <Fingerprint className="w-8 h-8" />
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  Use ID
                </span>
              </motion.button>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => handleKeyPress("0")}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium text-white hover:bg-white/10 transition-colors"
          >
            0
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
              <line x1="18" y1="9" x2="12" y2="15"></line>
              <line x1="12" y1="9" x2="18" y2="15"></line>
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
