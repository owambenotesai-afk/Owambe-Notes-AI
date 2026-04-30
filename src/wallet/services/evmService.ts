import { ethers } from "ethers";

const RPC_URLS = {
  mainnet: "https://eth.llamarpc.com",
  sepolia: "https://rpc2.sepolia.org",
};

export const evmService = {
  getProvider(network: "mainnet" | "sepolia" = "mainnet") {
    return new ethers.JsonRpcProvider(RPC_URLS[network]);
  },

  createWalletContext(
    mnemonic: string,
    network: "mainnet" | "sepolia" = "mainnet",
  ) {
    const provider = this.getProvider(network);
    const wallet = ethers.Wallet.fromPhrase(mnemonic, provider);
    return wallet;
  },

  async getBalance(
    address: string,
    network: "mainnet" | "sepolia" = "mainnet",
  ) {
    const provider = this.getProvider(network);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  },

  async sendTransaction(
    mnemonic: string,
    to: string,
    amount: string,
    network: "mainnet" | "sepolia" = "mainnet",
  ) {
    const wallet = this.createWalletContext(mnemonic, network);
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });
    return tx.hash;
  },
};
