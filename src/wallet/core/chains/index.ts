import { EthereumChain } from "./ethereum";
import { BSCChain } from "./bsc";
import { PolygonChain } from "./polygon";
import { BTCChain } from "./bitcoin";

export const supportedChains = [
  EthereumChain,
  BSCChain,
  PolygonChain,
  BTCChain,
];

export const getChainById = (id: string) => {
  return supportedChains.find((c) => c.config.id === id) || EthereumChain;
};
