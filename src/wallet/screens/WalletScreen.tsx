import React, { useState, useEffect } from "react";
import { walletService } from "../services/walletService";
import { tokenService, Token } from "../services/tokenService";
import { nftService, NFT } from "../services/nftService";
import { analyticsService } from "../services/analyticsService";
import { securityEngine, RiskAssessment } from "../services/securityEngine";
import {
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  RefreshCcw,
  X,
  Copy,
  Plus,
  Send,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  CreditCard,
  Image,
  Info,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { QrScannerModal } from "../components/QrScannerModal";
import { AppLock } from "../components/AppLock";
import { ethers } from "ethers";
import { useWalletStore } from "../store/useWalletStore";
import { supportedChains, getChainById } from "../core/chains";

interface TokenBalance extends Token {
  balance: string;
}

export const WalletScreen = () => {
  const {
    balance,
    setBalance,
    address,
    setAddress,
    activeTab,
    setActiveTab,
    selectedChainId,
    setSelectedChainId,
  } = useWalletStore();
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);

  // Modals
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showConfirmTx, setShowConfirmTx] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(
    null,
  );

  // Send State
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(null);

  // Add Token state
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [addTokenError, setAddTokenError] = useState("");

  const walletData = walletService.getWallet();
  const activeChain = getChainById(selectedChainId);

  const fetchData = async () => {
    if (!walletData) return;
    setIsRefreshing(true);
    try {
      let activeAddress = walletData.addresses.eth;
      if (!activeChain.config.isEVM) {
        activeAddress = walletData.addresses.btcHex || "1MckT...";
      }
      setAddress(activeAddress);

      // Fetch Native Balance
      const bal = await activeChain.getBalance(activeAddress);
      setBalance(Number(bal).toFixed(4));

      // Fetch Tokens
      if (activeChain.config.isEVM) {
        const supportedTokens = tokenService.getTokens();
        const tokenBalances: TokenBalance[] = [];

        for (const t of supportedTokens) {
          const tb = await tokenService.getTokenBalance(
            activeAddress,
            t.address,
            t.decimals,
            "mainnet",
          );
          tokenBalances.push({ ...t, balance: Number(tb).toFixed(4) });
        }
        setTokens(tokenBalances);
      } else {
        setTokens([]);
      }

      // Fetch NFTs
      if (activeChain.config.isEVM) {
        const nftData = await nftService.getNFTs(
          activeAddress,
          selectedChainId,
        );
        setNfts(nftData);
      } else {
        setNfts([]);
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedChainId]);

  const handleAddToken = async () => {
    setAddTokenError("");
    if (!newTokenAddress) return;
    const added = await tokenService.addCustomToken(newTokenAddress, "mainnet");
    if (added) {
      setShowAddToken(false);
      setNewTokenAddress("");
      fetchData();
    } else {
      setAddTokenError("Invalid contract address or ABI");
    }
  };

  const handleScan = (text: string) => {
    let address = text;
    if (text.startsWith("ethereum:")) {
      address = text.split(":")[1].split("@")[0];
    }
    setRecipient(address);
    setShowScanner(false);
  };

  const handleSendRequest = async () => {
    if (
      !recipient ||
      (!amount && !selectedNft) ||
      (amount && Number(amount) <= 0)
    )
      return;

    // Call security engine
    const assessment = await securityEngine.analyzeTransaction(
      recipient,
      selectedNft ? "0" : amount,
      "0x", // We don't have smart contract interaction data here yet for simple sends
    );
    setRiskAssessment(assessment);
    setShowConfirmTx(true);
  };

  const executeSend = async () => {
    try {
      alert(
        selectedNft
          ? `Sent NFT ${selectedNft.name}`
          : `Sent ${amount} ${selectedToken ? selectedToken.symbol : activeChain.config.symbol} to ${recipient}`,
      );
      setShowConfirmTx(false);
      setShowSend(false);
      setSelectedNft(null);
      setRecipient("");
      setAmount("");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Transaction failed");
    }
  };

  const handleBuyCrypto = () => {
    analyticsService.trackFiatOnRampOpen();
    window.open("https://global.transak.com", "_blank"); // Mock Transak Redirect
  };

  if (!walletData) return null;

  return (
    <div className="pt-2 px-4 space-y-6 pb-32">
      {/* Network Selector Header */}
      <div className="flex justify-between items-center bg-[#1A1F2E] p-3 rounded-full border border-white/5 relative z-30 mb-2 mt-4">
        <div className="w-8 h-8 rounded-full bg-[#3375BB]/20 flex items-center justify-center">
          <img
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=transparent`}
            alt="avatar"
            className="w-6 h-6 rounded-full"
          />
        </div>
        <button
          onClick={() => setShowChainSelector(!showChainSelector)}
          className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/5 hover:bg-white/5 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-semibold text-sm">
            {activeChain.config.name}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleBuyCrypto}
          className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-500/20"
        >
          <CreditCard className="w-4 h-4" />
        </button>

        {showChainSelector && (
          <div
            className="absolute top-14 left-1/2 -translate-x-1/2 w-48 bg-[#1A1F2E] border border-white/10 rounded-2xl shadow-xl overflow-hidden py-2"
            onMouseLeave={() => setShowChainSelector(false)}
          >
            {supportedChains.map((chain) => (
              <button
                key={chain.config.id}
                onClick={() => {
                  setSelectedChainId(chain.config.id);
                  setShowChainSelector(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${selectedChainId === chain.config.id ? "text-[#3375BB]" : "text-white"}`}
              >
                {chain.config.name}
                {selectedChainId === chain.config.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3375BB]"></span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1A1F2E] border border-white/5 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <div className="w-40 h-40 rounded-full border-4 border-white"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <p className="text-gray-400 font-medium text-sm mb-1">
            Total Balance
          </p>
          <div className="flex items-end gap-2 mb-8">
            <h1 className="text-5xl font-bold">
              $
              {(
                Number(balance) * 3500 +
                tokens.reduce((acc, t) => acc + Number(t.balance) * 1, 0)
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h1>
          </div>

          <div className="flex items-center justify-center gap-6 w-full">
            <button
              onClick={() => {
                setSelectedToken(null);
                setSelectedNft(null);
                setShowSend(true);
              }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-[#3375BB] flex items-center justify-center transition-transform group-active:scale-95 shadow-[0_0_20px_rgba(51,117,187,0.3)]">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white">
                Send
              </span>
            </button>

            <button
              onClick={() => setShowReceive(true)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-[#3375BB] flex items-center justify-center transition-transform group-active:scale-95 shadow-[0_0_20px_rgba(51,117,187,0.3)]">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white">
                Receive
              </span>
            </button>

            <button
              onClick={handleBuyCrypto}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center transition-transform group-active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-300 group-hover:text-white">
                Buy
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab("tokens")}
          className={`font-semibold text-lg transition-colors ${activeTab === "tokens" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          Tokens
        </button>
        <button
          onClick={() => setActiveTab("nfts")}
          className={`font-semibold text-lg transition-colors ${activeTab === "nfts" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          NFTs
        </button>
      </div>

      {/* Token List */}
      {activeTab === "tokens" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-400">
              Assets on {activeChain.config.name}
            </h3>
            <div className="flex gap-2">
              {activeChain.config.isEVM && (
                <button
                  onClick={() => setShowAddToken(true)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={fetchData}
                disabled={isRefreshing}
                className={`p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors ${isRefreshing ? "animate-spin" : ""}`}
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Native Token */}
          <div
            onClick={() => {
              setSelectedToken(null);
              setShowSend(true);
            }}
            className="bg-[#1A1F2E] hover:bg-[#1f2537] cursor-pointer rounded-2xl p-4 flex items-center justify-between border border-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#627EEA] flex items-center justify-center shadow-lg shadow-[#627EEA]/20">
                <span className="text-white font-bold text-sm">
                  {activeChain.config.symbol}
                </span>
              </div>
              <div>
                <p className="font-semibold text-white text-lg">
                  {activeChain.config.name}
                </p>
                <p className="text-sm text-gray-400">
                  {balance} {activeChain.config.symbol}
                </p>
              </div>
            </div>
            <div className="text-right">
              {/* Note: Mocking price for Native Token at 3500 for ETH/others for demo */}
              <p className="font-semibold text-white text-lg">
                $
                {(Number(balance) * 3500).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* ERC20 Tokens */}
          {tokens.map((token, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedToken(token);
                setShowSend(true);
              }}
              className="bg-[#1A1F2E] hover:bg-[#1f2537] cursor-pointer rounded-2xl p-4 flex items-center justify-between border border-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#26A17B] flex items-center justify-center shadow-lg shadow-[#26A17B]/20 text-white font-bold">
                  {token.symbol.substring(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">
                    {token.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {token.balance} {token.symbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white text-lg">
                  $
                  {(Number(token.balance) * 1).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NFT Grid */}
      {activeTab === "nfts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm text-gray-400">
              Collectibles on {activeChain.config.name}
            </h3>
          </div>

          {!activeChain.config.isEVM ? (
            <div className="text-center py-10 opacity-50">
              <Image className="w-12 h-12 mx-auto mb-2 text-gray-500" />
              <p>NFTs not supported on this chain.</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <Image className="w-12 h-12 mx-auto mb-2 text-gray-500" />
              <p>No NFTs found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {nfts.map((nft) => (
                <div
                  key={nft.id}
                  onClick={() => {
                    setSelectedNft(nft);
                    setShowSend(true);
                  }}
                  className="bg-[#1A1F2E] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-white/20 transition-colors"
                >
                  <img
                    src={nft.imageUrl}
                    alt={nft.name}
                    loading="lazy"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-1 truncate">
                      {nft.collectionName}
                    </p>
                    <p className="font-semibold text-sm truncate">{nft.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showReceive && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1F2E] w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-white">
                Receive ETH/Tokens
              </h3>
              <button
                onClick={() => setShowReceive(false)}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-2xl">
                <QRCodeSVG
                  value={`ethereum:${walletData.addresses.eth}`}
                  size={200}
                  level="Q"
                  includeMargin={false}
                />
              </div>
              <div className="w-full space-y-3 test-center">
                <p className="text-sm text-center text-gray-400 font-medium">
                  Send only ETH or compatible ERC-20 tokens to this address.
                </p>
                <div
                  className="bg-black/40 p-4 rounded-2xl break-all text-sm font-medium text-white cursor-pointer flex flex-col items-center justify-center gap-2 border border-white/5 active:scale-95 transition-transform"
                  onClick={() =>
                    navigator.clipboard.writeText(walletData.addresses.eth)
                  }
                >
                  <span className="text-center">
                    {walletData.addresses.eth}
                  </span>
                  <div className="flex items-center text-[#3375BB] gap-1">
                    <Copy className="w-4 h-4" />{" "}
                    <span className="text-sm">Copy Address</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1F2E] w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-white">
                Send {selectedToken ? selectedToken.symbol : "ETH"}
              </h3>
              <button
                onClick={() => {
                  setShowSend(false);
                  setRecipient("");
                  setAmount("");
                }}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  Recipient Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full pl-4 pr-12 py-4 bg-black/40 text-white border border-white/10 rounded-2xl outline-none focus:border-[#3375BB] transition-colors"
                  />
                  <button
                    onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#3375BB] hover:bg-[#3375BB]/20 rounded-xl"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
                {recipient && !ethers.isAddress(recipient) && (
                  <p className="text-red-400 text-xs">
                    Invalid Ethereum address format
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-4 text-2xl font-bold bg-transparent text-white border-b-2 border-white/10 rounded-none outline-none focus:border-[#3375BB] transition-colors text-center shadow-none"
                  />
                  <div className="absolute right-0 bottom-4 text-gray-400 font-bold">
                    {selectedToken ? selectedToken.symbol : "ETH"}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2 p-1">
                  <span>
                    Balance: {selectedToken ? selectedToken.balance : balance}{" "}
                    {selectedToken ? selectedToken.symbol : "ETH"}
                  </span>
                  <button
                    onClick={() =>
                      setAmount(selectedToken ? selectedToken.balance : balance)
                    }
                    className="text-[#3375BB] font-bold"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button
                onClick={handleSendRequest}
                disabled={
                  !recipient ||
                  !ethers.isAddress(recipient) ||
                  !amount ||
                  Number(amount) <= 0
                }
                className="w-full py-4 mt-4 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                Continue <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirmTx && (
        <AppLock
          isTransaction
          riskLevel={riskAssessment?.isHighRisk ? "HIGH" : "LOW"}
          actionExplanation={riskAssessment?.actionExplanation}
          onCancel={() => setShowConfirmTx(false)}
          onUnlock={() => {
            setShowConfirmTx(false);
            executeSend();
          }}
        />
      )}

      {showAddToken && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A1F2E] w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-white">Add Custom Token</h3>
              <button
                onClick={() => setShowAddToken(false)}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={newTokenAddress}
                  onChange={(e) => setNewTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-4 bg-black/40 text-white border border-white/10 rounded-2xl outline-none focus:border-[#3375BB] transition-colors"
                />
              </div>
              {addTokenError && (
                <p className="text-red-400 text-sm">{addTokenError}</p>
              )}
              <button
                onClick={handleAddToken}
                disabled={
                  !newTokenAddress || !ethers.isAddress(newTokenAddress)
                }
                className="w-full py-4 mt-4 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors"
              >
                Import Token
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleScan}
        />
      )}
    </div>
  );
};
