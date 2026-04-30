import { EVMChain } from "./EVMChain";
export const EthereumChain = new EVMChain({
  id: "ethereum",
  name: "Ethereum",
  symbol: "ETH",
  rpcUrl: import.meta.env.VITE_RPC_URL_MAINNET || "https://cloudflare-eth.com",
  isEVM: true,
  derivationPath: "m/44'/60'/0'/0/0",
  blockExplorerUrl: "https://etherscan.io",
});
