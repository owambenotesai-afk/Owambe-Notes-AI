import React, { useState } from "react";
import {
  Compass,
  Link,
  ShieldAlert,
  CheckCircle,
  TrendingUp,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Search,
} from "lucide-react";
import { QrScannerModal } from "../components/QrScannerModal";
import { riskAPI } from "../services/riskAPI";
import { motion } from "framer-motion";

const TRENDING_COINS = [
  {
    id: 1,
    name: "Solana",
    symbol: "SOL",
    price: "$142.50",
    change: "+12.4%",
    isUp: true,
    glow: "rgba(20,241,149,0.3)",
    color: "#14F195",
  },
  {
    id: 2,
    name: "Sui",
    symbol: "SUI",
    price: "$1.82",
    change: "+8.7%",
    isUp: true,
    glow: "rgba(74,161,255,0.3)",
    color: "#4AA1FF",
  },
  {
    id: 3,
    name: "Pepe",
    symbol: "PEPE",
    price: "$0.0000078",
    change: "-2.1%",
    isUp: false,
    glow: "rgba(255,77,77,0.3)",
    color: "#FF4D4D",
  },
  {
    id: 4,
    name: "Chainlink",
    symbol: "LINK",
    price: "$18.90",
    change: "+5.2%",
    isUp: true,
    glow: "rgba(42,90,218,0.3)",
    color: "#2A5ADA",
  },
];

export const DiscoverScreen = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [wcUri, setWcUri] = useState("");
  const [showPhishingWarning, setShowPhishingWarning] = useState(false);

  const handleScan = (text: string) => {
    setWcUri(text);
    setShowScanner(false);
    verifyAndConnect(text);
  };

  const verifyAndConnect = async (uri: string) => {
    if (!uri) return;
    const isRisky = await riskAPI.checkDomain(uri);
    if (isRisky) {
      setShowPhishingWarning(true);
      return;
    }

    alert(
      `WalletConnect URI scanned: \n${uri.substring(0, 20)}...\n\nNote: Need to configure Project ID to establish session.`,
    );
  };

  return (
    <div className="px-4 pb-32 flex flex-col min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 pt-4"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Discover
        </h1>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
          <Search className="w-5 h-5 text-gray-400" />
        </button>
      </motion.div>

      {/* Trending Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-[#FF6B6B]" />
          <h2 className="text-lg font-bold text-white">Trending</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {TRENDING_COINS.map((coin, index) => (
            <motion.div
              key={coin.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-4 rounded-3xl bg-white/5 border border-white/10 overflow-hidden group cursor-pointer"
            >
              <div
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[30px] opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                style={{ backgroundColor: coin.color }}
              />

              <div className="flex flex-col gap-1 relative z-10">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                  {coin.symbol}
                </span>
                <span className="text-white font-bold">{coin.name}</span>

                <div className="mt-3 flex items-end justify-between">
                  <span className="text-white text-lg font-medium">
                    {coin.price}
                  </span>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-bold \${coin.isUp ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {coin.isUp ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {coin.change}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* WalletConnect Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <div className="w-full bg-[#1A1F2E]/80 backdrop-blur-md p-6 rounded-[32px] border border-white/5 space-y-4 relative shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          {showPhishingWarning && (
            <div className="absolute inset-0 bg-red-950/90 z-20 rounded-[32px] flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in zoom-in">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="font-bold text-xl text-white mb-2 text-center">
                Phishing Detected
              </h3>
              <p className="text-red-300 text-sm text-center mb-6">
                Deep inspection blocked this connection because the target
                domain is associated with malicious activity.
              </p>
              <button
                onClick={() => {
                  setShowPhishingWarning(false);
                  setWcUri("");
                }}
                className="py-3 px-8 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                Abort Connection
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-left text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#3375BB]/20 flex items-center justify-center">
                <Compass className="w-4 h-4 text-[#3375BB]" />
              </div>
              Web3 Browser
            </h3>
            <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                Protected
              </span>
            </div>
          </div>

          <p className="text-left text-sm text-gray-400 mb-4">
            Connect to dApps securely. We analyze targets in real-time.
          </p>

          <input
            type="text"
            value={wcUri}
            onChange={(e) => setWcUri(e.target.value)}
            placeholder="Paste WalletConnect URI (wc:...)"
            className="w-full px-4 py-4 bg-black/40 text-white border border-white/10 rounded-2xl outline-none focus:border-[#3375BB] focus:bg-[#1A1F2E] transition-all text-sm"
          />

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => setShowScanner(true)}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all duration-300 text-sm active:scale-95"
            >
              Scan QR
            </button>
            <button
              onClick={() => verifyAndConnect(wcUri)}
              disabled={!wcUri}
              className="flex-[2] py-4 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-[#3375BB]/30 disabled:text-white/30 text-white rounded-2xl font-bold transition-all duration-300 text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(51,117,187,0.3)] active:scale-95"
            >
              <Link className="w-4 h-4" /> Connect
            </button>
          </div>
        </div>
      </motion.div>

      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
        />
      )}
    </div>
  );
};
