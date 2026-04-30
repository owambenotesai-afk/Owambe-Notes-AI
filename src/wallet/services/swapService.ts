import { ethers } from "ethers";
import { tokenService, Token } from "./tokenService";
import { analyticsService } from "./analyticsService";
import { config } from "../config/env";

export interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string; // The estimated amount received
  exchangeRate: string;
  estimatedGasWei: string;
  priceImpact: number;
}

export const SWAP_FEE_PERCENTAGE = 0.5; // 0.5% fee

export const swapService = {
  // Uses ChangeNOW API for cross-chain and same-chain swaps
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
  ): Promise<SwapQuote | null> {
    if (!amount || Number(amount) <= 0) return null;

    if (!config.CHANGENOW_API_KEY) {
       console.warn("ChangeNOW API key missing, falling back to mock quote");
       return this._getMockQuote(fromToken, toToken, amount);
    }
    
    try {
      // Setup API call to ChangeNOW
      const response = await fetch(`https://api.changenow.io/v2/exchange/estimated-amount?fromCurrency=${fromToken.symbol.toLowerCase()}&toCurrency=${toToken.symbol.toLowerCase()}&fromAmount=${amount}&fromNetwork=eth&toNetwork=eth&type=direct`, {
        headers: {
            'x-changenow-api-key': config.CHANGENOW_API_KEY
        }
      });
      const data = await response.json();
      
      if (data.toAmount) {
         return {
            fromToken,
            toToken,
            fromAmount: amount,
            toAmount: data.toAmount.toString(),
            exchangeRate: (Number(data.toAmount) / Number(amount)).toFixed(6),
            estimatedGasWei: ethers.parseUnits("50", "gwei").toString(),
            priceImpact: 0, // Not provided directly by simple endpoint in this way, mock as 0
         };
      } else {
          return this._getMockQuote(fromToken, toToken, amount);
      }
    } catch(err) {
        console.error("ChangeNOW fetch failed", err);
        return this._getMockQuote(fromToken, toToken, amount);
    }
  },

  _getMockQuote(fromToken: Token, toToken: Token, amount: string): SwapQuote {
    let fromPrice = 1;
    let toPrice = 1;

    if (fromToken.symbol === "ETH" || fromToken.symbol === "WETH") fromPrice = 3500;
    if (toToken.symbol === "ETH" || toToken.symbol === "WETH") toPrice = 3500;

    const rate = fromPrice / toPrice;

    const valueUsd = Number(amount) * fromPrice;
    const priceImpact = Math.min(valueUsd / 100000, 5); 

    const finalRate = rate * (1 - priceImpact / 100);
    const amountAfterNetworkImpact = Number(amount) * finalRate;

    const feeCollected = amountAfterNetworkImpact * (SWAP_FEE_PERCENTAGE / 100);
    const toAmount = (amountAfterNetworkImpact - feeCollected).toFixed(6);

    analyticsService.trackSwap(amount, valueUsd, feeCollected * toPrice);

    return {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount,
      exchangeRate: finalRate.toFixed(6),
      estimatedGasWei: ethers.parseUnits("50", "gwei").toString(),
      priceImpact,
    };
  },

  async executeSwap(
    quote: SwapQuote,
    slippageTolerance: number,
  ): Promise<string> {
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return mock tx hash
    return (
      "0x" +
      Array.from({ length: 64 })
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")
    );
  },
};
