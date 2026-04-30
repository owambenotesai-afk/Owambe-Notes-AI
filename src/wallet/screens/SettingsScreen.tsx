import React, { useState } from "react";
import {
  Shield,
  Fingerprint,
  HelpCircle,
  ChevronRight,
  Flame,
} from "lucide-react";
import { HelpScreen } from "./HelpScreen";
import { SecurityScreen } from "./SecurityScreen";
import { TrendingScreen } from "./TrendingScreen";
import { AnimatePresence } from "framer-motion";

export const SettingsScreen = ({ onLogout }: { onLogout: () => void }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTrending, setShowTrending] = useState(false);

  return (
    <div className="p-6 pb-32">
      <h2 className="text-2xl font-bold mb-6 text-white">Settings</h2>

      <div className="space-y-6">
        <section>
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
            <button
              onClick={() => setShowTrending(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Trending</p>
                  <p className="text-xs text-gray-500">News, listings & insights</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowSecurity(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Security & Backup</p>
                  <p className="text-xs text-gray-500">PIN, Passphrase, and Lock</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <div className="w-full flex items-center justify-between p-4 border-b border-white/5 opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Biometric Unlock</p>
                  <p className="text-xs text-gray-500">Face ID / Touch ID (Simulated)</p>
                </div>
              </div>
              <div className="w-10 h-6 bg-emerald-500 rounded-full flex justify-end p-1">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 px-1">
            Support
          </h3>
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Help Center</p>
                  <p className="text-xs text-gray-500">FAQs & Chatbot</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showHelp && <HelpScreen onClose={() => setShowHelp(false)} />}
        {showTrending && <TrendingScreen onClose={() => setShowTrending(false)} />}
        {showSecurity && <SecurityScreen onClose={() => setShowSecurity(false)} onLogout={onLogout} />}
      </AnimatePresence>
    </div>
  );
};
