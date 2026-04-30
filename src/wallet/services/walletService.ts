import { AES, enc, SHA256 } from "crypto-js";

const STORAGE_KEY = "omi_wallet_data";

export interface WalletData {
  encryptedSeed: string;
  addresses: {
    eth: string;
    btcHex?: string; // Hex representation as mock since wasm fails
  };
}

export const walletService = {
  // Derive a strong encryption key from the PIN
  _deriveKey(pin: string): string {
    return SHA256(pin.trim()).toString();
  },

  encryptSeed(mnemonic: string, pin: string): string {
    const key = this._deriveKey(pin);
    const encrypted = AES.encrypt(mnemonic, key).toString();

    // In a fully native environment, we would securely zero out the mnemonic string in memory here.
    // In JS/Web, we rely on the GC dropping references.

    return encrypted;
  },

  decryptSeed(encryptedSeed: string, pin: string): string | null {
    try {
      const key = this._deriveKey(pin);
      const bytes = AES.decrypt(encryptedSeed, key);
      const originalText = bytes.toString(enc.Utf8);

      // Basic sanity check to ensure the decrypted data looks like a mnemonic phrase
      if (originalText && originalText.split(" ").length >= 12) {
        return originalText;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  saveWallet(data: WalletData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  saveWalletLockPin(pin: string) {
    // Save a hashed version to verify the lock pin
    localStorage.setItem("wallet_lock_pin", this._deriveKey(pin));
  },

  hasWalletLockPin(): boolean {
    return !!localStorage.getItem("wallet_lock_pin");
  },

  verifyWalletLockPin(pin: string): boolean {
    const saved = localStorage.getItem("wallet_lock_pin");
    return saved === this._deriveKey(pin);
  },

  getWallet(): WalletData | null {
    const data = localStorage.getItem(STORAGE_KEY);
    return data && data !== "0x00000000000000000000000000"
      ? JSON.parse(data)
      : null;
  },

  clearWallet() {
    // Explicitly overwrite the local storage cell to mitigate data recovery risks
    localStorage.setItem(STORAGE_KEY, "0x00000000000000000000000000");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("wallet_lock_pin");
  },

  verifyPin(pin: string): boolean {
    const wallet = this.getWallet();
    if (!wallet) return false;
    // Attempting to decrypt serves as pin verification
    return this.decryptSeed(wallet.encryptedSeed, pin) !== null;
  },
};
