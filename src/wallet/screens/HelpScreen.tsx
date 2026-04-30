import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Bot,
  Send,
  User,
} from "lucide-react";

export const HelpScreen = ({ onClose }: { onClose: () => void }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<
    { from: "bot" | "user"; text: string }[]
  >([
    {
      from: "bot",
      text: "Hi! I am the Support Bot. Ask me about your wallet, seed phrases, or security.",
    },
  ]);

  const faqs = [
    {
      q: "What is a seed phrase?",
      a: "Your seed phrase is the master key to your wallet. If you lose it, you lose access to your funds. Never share it with anyone.",
    },
    {
      q: "How to recover wallet?",
      a: "You can recover your wallet on any device using your 12 or 24-word seed phrase. Go to 'Import Existing Wallet' during setup.",
    },
    {
      q: "What if I forget my PIN?",
      a: "If you forget your 6-digit Wallet Lock PIN, you will need to cleanly clear your app data and re-import your wallet using your seed phrase.",
    },
  ];

  const handleSend = () => {
    if (!message.trim()) return;

    const userMsg = message;
    setChatLog((prev) => [...prev, { from: "user", text: userMsg }]);
    setMessage("");

    // Simple bot logic
    setTimeout(() => {
      let botResponse =
        "I'm sorry, I don't quite understand. Please check the FAQs or contact support.";
      const lower = userMsg.toLowerCase();
      if (lower.includes("seed phrase")) {
        botResponse =
          "Your seed phrase is the key to your wallet. Never share it. Anyone with your seed phrase can take your funds.";
      } else if (lower.includes("pin") || lower.includes("password")) {
        botResponse =
          "Your PIN secures the app on this device. If you lose it, you must restore your wallet from your seed phrase.";
      } else if (lower.includes("scam") || lower.includes("safe")) {
        botResponse =
          "We use heuristic AI to identify malicious contracts. Always review the warnings on the confirmation screen before signing.";
      }

      setChatLog((prev) => [...prev, { from: "bot", text: botResponse }]);
    }, 600);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3, ease: "easeOut" }} className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full">
      <div className="flex items-center p-4 border-b border-white/5 bg-[#121826]">
        <button onClick={onClose} className="mr-4 text-emerald-400 font-medium">
          Close
        </button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-500" />
          Help Center
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-8 pb-28">
        {/* FAQs */}
        <section>
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-4 flex justify-between items-center text-left"
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  {activeFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {activeFaq === i && (
                  <div className="p-4 pt-0 text-sm text-gray-400 leading-relaxed border-t border-white/5 bg-black/20">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Chatbot */}
        <section className="flex-1 flex flex-col min-h-[400px] border border-white/10 rounded-3xl overflow-hidden bg-black/40">
          <div className="bg-[#121826] p-3 text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5">
            <Bot className="w-4 h-4" /> Support Assistant
          </div>
          <div className="flex-1 p-4 overflow-y-auto scrollbar-hide space-y-4">
            {chatLog.map((log, i) => (
              <div
                key={i}
                className={`flex gap-3 ${log.from === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.from === "user" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}
                >
                  {log.from === "user" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl max-w-[75%] text-sm ${log.from === "user" ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-white/10 text-gray-200 rounded-tl-sm"}`}
                >
                  {log.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-[#121826] border-t border-white/5 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleSend}
              className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center transition-colors text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
        </motion.div>
  );
};
