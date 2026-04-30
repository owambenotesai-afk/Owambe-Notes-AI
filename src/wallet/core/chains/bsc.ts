import { EVMChain } from "./EVMChain";
export const BSCChain = new EVMChain({
  id: "bsc",
  name: "BNB Smart Chain",
  symbol: "BNB",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  isEVM: true,
  derivationPath: "m/44'/60'/0'/0/0",
  blockExplorerUrl: "https://bscscan.com",
});
