import { ethers } from "ethers";
import { evmService } from "./evmService";

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
];

export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  isCustom?: boolean;
}

const DEFAULT_TOKENS: Token[] = [
  {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT on Mainnet
    symbol: "USDT",
    decimals: 6,
    name: "Tether USD",
  },
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC on Mainnet
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
  },
];

const CUSTOM_TOKENS_KEY = "omi_wallet_custom_tokens";

export const tokenService = {
  getTokens(): Token[] {
    const customTokensStr = localStorage.getItem(CUSTOM_TOKENS_KEY);
    const customTokens: Token[] = customTokensStr
      ? JSON.parse(customTokensStr)
      : [];
    return [...DEFAULT_TOKENS, ...customTokens];
  },

  async addCustomToken(
    address: string,
    network: "mainnet" | "sepolia" = "mainnet",
  ): Promise<Token | null> {
    try {
      const provider = evmService.getProvider(network);
      const contract = new ethers.Contract(address, ERC20_ABI, provider);

      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      const name = await contract.name();

      const newToken: Token = {
        address,
        symbol,
        decimals: Number(decimals),
        name,
        isCustom: true,
      };

      const customTokensStr = localStorage.getItem(CUSTOM_TOKENS_KEY);
      const customTokens: Token[] = customTokensStr
        ? JSON.parse(customTokensStr)
        : [];

      if (
        !customTokens.find(
          (t) => t.address.toLowerCase() === address.toLowerCase(),
        )
      ) {
        customTokens.push(newToken);
        localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customTokens));
      }

      return newToken;
    } catch (error) {
      console.error("Error adding token:", error);
      return null;
    }
  },

  async getTokenBalance(
    walletAddress: string,
    tokenAddress: string,
    decimals: number,
    network: "mainnet" | "sepolia" = "mainnet",
  ): Promise<string> {
    try {
      const provider = evmService.getProvider(network);
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      return ethers.formatUnits(balance, decimals);
    } catch (e) {
      console.error("Error fetching token balance:", e);
      return "0";
    }
  },

  async sendToken(
    mnemonic: string,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
    network: "mainnet" | "sepolia" = "mainnet",
  ) {
    const wallet = evmService.createWalletContext(mnemonic, network);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const parsedAmount = ethers.parseUnits(amount, decimals);
    const tx = await contract.transfer(to, parsedAmount);
    return tx.hash;
  },
};
