export const analyticsService = {
  trackSwap(amountIn: string, valueUsd: number, feeCollectedUsd: number) {
    if (import.meta.env.VITE_ENABLE_ANALYTICS === "true") {
      console.log("[Analytics] Swap executed", {
        amountIn,
        valueUsd,
        feeCollectedUsd,
      });
    }
  },

  trackFiatOnRampOpen() {
    if (import.meta.env.VITE_ENABLE_ANALYTICS === "true") {
      console.log("[Analytics] Fiat On-Ramp Opened");
    }
  },
};
