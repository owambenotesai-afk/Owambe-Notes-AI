import React, { useState, useEffect } from "react";
import { ArrowDownUp, Settings, AlertTriangle } from "lucide-react";
import { tokenService, Token } from "../services/tokenService";
import { swapService, SwapQuote } from "../services/swapService";
import { ethers } from "ethers";
import { walletService } from "../services/walletService";

export const SwapScreen = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [slippage, setSlippage] = useState(1.0); // 1%
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  // ETH Mock definition
  const ethToken: Token = {
    address: "0x0",
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  };

  useEffect(() => {
    const list = [ethToken, ...tokenService.getTokens()];
    setTokens(list);
    setFromToken(list[0]); // ETH
    setToToken(list[1]); // USDT
  }, []);

  useEffect(() => {
    if (!fromAmount || !fromToken || !toToken || Number(fromAmount) <= 0) {
      setQuote(null);
      return;
    }

    // Debounce
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const q = await swapService.getQuote(fromToken, toToken, fromAmount);
        setQuote(q);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fromAmount, fromToken, toToken]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(quote ? quote.toAmount : "");
  };

  const handleExecute = async () => {
    if (!quote) return;
    setIsSwapping(true);
    try {
      const tx = await swapService.executeSwap(quote, slippage);
      alert(`Swap successful! TX Hash: ${tx}`);
      setShowConfirm(false);
      setFromAmount("");
    } catch (e) {
      alert("Swap failed.");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="pt-2 px-4 pb-32 flex flex-col items-center min-h-[70vh] bg-[#0B0F1A] text-white">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Swap</h2>
          <button
            onClick={() => {
              const slip = prompt(
                "Enter slippage tolerance (%)",
                slippage.toString(),
              );
              if (slip && !isNaN(Number(slip))) setSlippage(Number(slip));
            }}
            className="p-2 bg-[#1A1F2E] rounded-full text-gray-400 hover:text-white border border-white/5"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#1A1F2E] p-4 rounded-3xl border border-white/5 space-y-1 relative shadow-lg">
          {/* FROM BOX */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-[#3375BB] transition-colors">
            <label className="text-xs font-medium text-gray-400">You pay</label>
            <div className="flex justify-between items-center mt-2">
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="text-3xl font-bold bg-transparent text-white outline-none w-[60%]"
              />
              <select
                value={fromToken?.symbol}
                onChange={(e) =>
                  setFromToken(
                    tokens.find((t) => t.symbol === e.target.value) || null,
                  )
                }
                className="font-bold px-3 py-2 bg-[#1A1F2E] text-white rounded-xl border border-white/10 outline-none appearance-none cursor-pointer hover:bg-white/5 text-sm"
              >
                {tokens.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SWAP BUTTON OVERLAY */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
            onClick={handleSwapTokens}
          >
            <div className="p-2 bg-[#1A1F2E] rounded-xl border-4 border-[#1A1F2E] group-hover:bg-[#2a3143] transition-colors">
              <ArrowDownUp className="w-5 h-5 text-[#3375BB]" />
            </div>
          </div>

          {/* TO BOX */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
            <label className="text-xs font-medium text-gray-400">
              You receive
            </label>
            <div className="flex justify-between items-center mt-2">
              {isLoading ? (
                <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
              ) : (
                <span className="text-3xl font-bold text-white overflow-hidden text-ellipsis mr-4">
                  {quote ? quote.toAmount : "0.0"}
                </span>
              )}
              <select
                value={toToken?.symbol}
                onChange={(e) =>
                  setToToken(
                    tokens.find((t) => t.symbol === e.target.value) || null,
                  )
                }
                className="font-bold px-3 py-2 bg-[#1A1F2E] text-white rounded-xl border border-white/10 outline-none appearance-none cursor-pointer hover:bg-white/5 shrink-0 text-sm"
              >
                {tokens.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* QUOTE INFO */}
        {quote && !isLoading && (
          <div className="mt-4 bg-[#1A1F2E] p-4 rounded-2xl border border-white/5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Rate</span>
              <span className="text-white font-medium">
                1 {fromToken?.symbol} = {quote.exchangeRate} {toToken?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Price Impact</span>
              <span
                className={`font-medium ${quote.priceImpact > 3 ? "text-red-400" : "text-green-400"}`}
              >
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Slippage Tolerance</span>
              <span className="text-white font-medium">
                {slippage.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowConfirm(true)}
          disabled={!quote || isLoading}
          className="w-full py-4 mt-6 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors shadow-[0_0_20px_rgba(51,117,187,0.3)]"
        >
          {isLoading ? "Fetching best price..." : "Review Swap"}
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && quote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1F2E] w-full max-w-md p-6 rounded-3xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-5">
            <h3 className="font-bold text-xl mb-6 text-center">Confirm Swap</h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                <span className="text-gray-400">Paying</span>
                <span className="font-bold text-lg text-white">
                  {quote.fromAmount} {quote.fromToken.symbol}
                </span>
              </div>
              <div className="flex justify-center -my-3 relative z-10 w-full">
                <div className="w-8 h-8 bg-[#1A1F2E] rounded-full flex items-center justify-center border border-white/5">
                  <ArrowDownUp className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                <span className="text-gray-400">Receiving</span>
                <span className="font-bold text-lg text-green-400">
                  ~{quote.toAmount} {quote.toToken.symbol}
                </span>
              </div>
            </div>

            {quote.priceImpact > 2 && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-400 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>
                  Warning: High price impact! You may lose a significant portion
                  of your funds due to low liquidity.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSwapping}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={isSwapping}
                className="flex-[2] py-4 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isSwapping ? (
                  <span className="animate-pulse">Swapping...</span>
                ) : (
                  "Confirm Protocol"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
