import { ethers } from "ethers";
import { IChain, ChainConfig } from "./ChainInterface";

export class EVMChain implements IChain {
  config: ChainConfig;
  provider: ethers.JsonRpcProvider;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  async getAddress(mnemonic: string): Promise<string> {
    const node = ethers.HDNodeWallet.fromPhrase(
      mnemonic,
      "",
      this.config.derivationPath,
    );
    return node.address;
  }

  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (e) {
      console.warn("RPC Error, returning 0.0");
      return "0.0";
    }
  }

  async sendTransaction(
    mnemonic: string,
    to: string,
    amount: string,
  ): Promise<string> {
    const wallet = ethers.HDNodeWallet.fromPhrase(
      mnemonic,
      "",
      this.config.derivationPath,
    ).connect(this.provider);
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });
    return tx.hash;
  }

  async getTransactions(address: string): Promise<any[]> {
    return []; // Requires Etherscan API or indexing node
  }
}
