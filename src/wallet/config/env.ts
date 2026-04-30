export const config = {
  // RPC Endpoints
  RPC_URL_MAINNET:
    import.meta.env.VITE_RPC_URL_MAINNET || "https://cloudflare-eth.com",
  RPC_URL_GOERLI:
    import.meta.env.VITE_RPC_URL_GOERLI || "https://rpc.ankr.com/eth_goerli",

  // WalletConnect
  WALLET_CONNECT_PROJECT_ID:
    import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "",

  // API Keys
  CHANGENOW_API_KEY: import.meta.env.VITE_CHANGENOW_API_KEY || "",

  // App Behavior
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
  IS_PRODUCTION: import.meta.env.PROD,
};
