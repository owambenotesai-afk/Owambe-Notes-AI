import React, { useState } from "react";
import { ChevronLeft, Flame, Newspaper, ArrowUpRight, ArrowDownRight, Stars } from "lucide-react";
import { motion } from "framer-motion";

const NEWS_MOCK = [
  { id: 1, title: "Ethereum ETF Approved by SEC", source: "CryptoTimes", time: "2h ago" },
  { id: 2, title: "Solana Network Hits New TPS Record", source: "DeFi Daily", time: "4h ago" },
  { id: 3, title: "Major Protocol Upgrade Coming Next Week", source: "Web3 News", time: "5h ago" },
];

const NEW_LISTINGS = [
  { id: 1, name: "Starknet", symbol: "STRK", price: "$1.85", change: "+14.2%", color: "#3B82F6" },
  { id: 2, name: "Jupiter", symbol: "JUP", price: "$1.24", change: "+8.9%", color: "#10B981" },
  { id: 3, name: "Manta", symbol: "MANTA", price: "$2.95", change: "-2.1%", color: "#EC4899" },
];

export const TrendingScreen = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3, ease: "easeOut" }} className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full">
      <div className="flex items-center p-4 border-b border-white/5 bg-[#121826]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="mr-3 text-gray-400 hover:text-emerald-400 transition-colors flex items-center p-1 rounded-full hover:bg-white/5">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Trending Insights
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-8 pb-28">
        
        {/* New Listings */}
        <section>
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4 flex items-center gap-2">
            <Stars className="w-4 h-4 text-purple-400" />
            New Listings
          </h3>
          <div className="space-y-3">
            {NEW_LISTINGS.map((coin, index) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: coin.color + '20', color: coin.color }}>
                    {coin.symbol[0]}
                  </div>
                  <div>
                    <p className="font-bold">{coin.name}</p>
                    <p className="text-xs text-gray-400">{coin.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{coin.price}</p>
                  <p className={"text-xs font-medium flex items-center justify-end gap-1 " + (coin.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400')}>
                    {coin.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {coin.change}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* News */}
        <section>
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-blue-400" />
            Crypto News
          </h3>
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
            {NEWS_MOCK.map((news, i) => (
              <div key={news.id} className={"p-4 hover:bg-white/5 transition-colors cursor-pointer " + (i !== NEWS_MOCK.length - 1 ? 'border-b border-white/5' : '')}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-sm mb-2">{news.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-blue-400">{news.source}</span>
                      <span>•</span>
                      <span>{news.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

            </div>
    </motion.div>
  );
};
