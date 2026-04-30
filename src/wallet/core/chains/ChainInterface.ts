import { Token } from "../../services/tokenService";

export interface ChainConfig {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  isEVM: boolean;
  derivationPath: string;
  blockExplorerUrl: string;
}

export interface IChain {
  config: ChainConfig;
  getAddress(mnemonic: string): Promise<string>;
  getBalance(address: string): Promise<string>;
  sendTransaction(
    mnemonic: string,
    to: string,
    amount: string,
  ): Promise<string>;
  getTransactions(address: string): Promise<any[]>;
}
