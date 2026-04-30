import { EVMChain } from "./EVMChain";
export const PolygonChain = new EVMChain({
  id: "polygon",
  name: "Polygon",
  symbol: "MATIC",
  rpcUrl: "https://polygon-rpc.com/",
  isEVM: true,
  derivationPath: "m/44'/60'/0'/0/0",
  blockExplorerUrl: "https://polygonscan.com",
});
