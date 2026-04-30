import { IChain, ChainConfig } from "./ChainInterface";
import { ethers } from "ethers";

export class BitcoinChain implements IChain {
  config: ChainConfig = {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    rpcUrl: "https://blockstream.info/api/",
    isEVM: false,
    derivationPath: "m/44'/0'/0'/0/0",
    blockExplorerUrl: "https://blockstream.info",
  };

  async getAddress(mnemonic: string): Promise<string> {
    // Generate a pseudo-deterministic BTC address for UI preview purposes
    // IN PRODUCTION: Use bitcoinjs-lib
    const hash = ethers.id(mnemonic + this.config.derivationPath);
    return "1" + hash.substring(2, 36).replace(/0/g, "1"); // pseudo BTC address
  }

  async getBalance(address: string): Promise<string> {
    return "0.0000"; // Mock BTC balance
  }

  async sendTransaction(
    mnemonic: string,
    to: string,
    amount: string,
  ): Promise<string> {
    throw new Error(
      "BTC transaction signing requires unspent output (UTXO) management. Check blockstream API.",
    );
  }

  async getTransactions(address: string): Promise<any[]> {
    return [];
  }
}

export const BTCChain = new BitcoinChain();
