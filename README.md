# Secure Non-Custodial Web Wallet

A modular, highly secure, non-custodial EVM wallet built into a modern web environment (React/Vite).

## 🚀 Features

- **Decentralized & Non-Custodial:** Your keys never leave your device.
- **Advanced Security Enclave:** Encrypted storage of mnemonics, protected by a user PIN.
- **Local Transaction Signing:** Ethers.js integration for strict local signing.
- **Smart Swap Integration:** Get best routes across DEX aggregators with built-in slippage tolerance protections.
- **App Lock:** Background blur & session locking requiring PIN/Biometrics based on visibility changes.
- **Anti-Phishing Module:** On-the-fly inspection of WalletConnect URIs and target domains.
- **Seamless Integrations:** Read/write to EVM chains dynamically with multiple RPC fallback support (ready for scale via env config).

## 📁 Architecture Overview

```
src/wallet/
├── components/   # Reusable atomic UI (setup flows, QR, AppLock)
├── config/       # Environment variables & constants mapping
├── core/         # Core cryptographic mechanics
├── navigation/   # Tab routing & secure context wrapper
├── screens/      # High-level views (Wallet, Swap, Discover, Settings)
├── services/     # Connective tissue (EVM, Wallet, Tokens, API integration)
└── store/        # Global state machine (Zustand)
```

## 🔐 Security Standards & Disclaimers

1. **Zero Knowledge:** We do not store, trace, access, or log your recovery phrases or private keys.
2. **Device Dependency:** This is a web-based implementation mimicking native secure enclaves. Your wallet data is AES-256 encrypted using your PIN and kept in local storage. *Clearing browser data WILL delete the encrypted wallet file.* **Always back up your seed phrase!**
3. **Phishing Awareness:** Always verify transaction payloads visually. The integrated safety scanners are heuristics, not infallible sentries.

## 🛠 Setup Instructions

1. Install dependencies: `npm install`
2. Configure `.env`: Copy `.env.example` to `.env` and configure your RPCs / WalletConnect Project ID.
3. Start Dev Server: `npm run dev`
4. Visit `http://localhost:3000`

## 🧪 Testing

We use Vitest and React Testing Library for verifying secure state.
- Run tests: `npm run test` (Coming Soon)
- The tests mock the local storage bridging and ensure the AES encryption cycles function completely offline without data leakage.

---
*Built for the next generation of decentralized finance.*
