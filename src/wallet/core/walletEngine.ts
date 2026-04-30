import { ethers } from "ethers";

export class WalletEngine {
  // Logic to process raw keys and maintain in-memory-only signing instances

  static deriveWalletFromMnemonic(
    mnemonic: string,
  ): ethers.HDNodeWallet | null {
    try {
      return ethers.Wallet.fromPhrase(mnemonic);
    } catch (e) {
      return null;
    }
  }

  static createRandomWallet(): ethers.HDNodeWallet {
    return ethers.Wallet.createRandom();
  }

  static signMessage(
    wallet: ethers.HDNodeWallet | ethers.Wallet,
    message: string,
  ): Promise<string> {
    return wallet.signMessage(message);
  }
}
