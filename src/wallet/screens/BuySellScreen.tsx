import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowRightLeft } from 'lucide-react';

export const BuySellScreen = () => {
  return (
    <div className="px-4 pb-32 flex flex-col min-h-[60vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 pt-4"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Buy & Sell</h1>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="w-full bg-[#1A1F2E]/80 backdrop-blur-md p-6 rounded-[32px] border border-white/5 space-y-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Fiat On-Ramp</h2>
              <p className="text-gray-400 text-sm max-w-[250px] mx-auto">
                Buy crypto with your credit card, debit card, or bank transfer soon.
              </p>
            </div>
            <button className="px-8 py-3 bg-[#3375BB] hover:bg-[#28609a] text-white font-bold rounded-full transition-colors opacity-50 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        <div className="w-full bg-[#1A1F2E]/80 backdrop-blur-md p-6 rounded-[32px] border border-white/5 space-y-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Sell to Fiat</h2>
              <p className="text-gray-400 text-sm max-w-[250px] mx-auto">
                Off-ramp your crypto to fiat directly to your bank account soon.
              </p>
            </div>
            <button className="px-8 py-3 bg-white/5 text-white font-bold rounded-full transition-colors opacity-50 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
