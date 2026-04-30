import React, { useState, useEffect } from "react";
import { walletService } from "../services/walletService";
import { ethers } from "ethers";
import { ShieldCheck, Info, CheckCircle2 } from "lucide-react";

export const SetupWallet = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<
    "intro" | "create" | "import" | "backup" | "verify" | "pin_app" | "pin_lock"
  >("intro");
  const [mnemonic, setMnemonic] = useState("");
  const [appPin, setAppPin] = useState("");
  const [confirmAppPin, setConfirmAppPin] = useState("");
  const [lockPin, setLockPin] = useState("");
  const [confirmLockPin, setConfirmLockPin] = useState("");

  const [importPhrase, setImportPhrase] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // If wallet data exists (was setup) but no wallet lock pin, route to pin_lock directly
    const hasWallet = !!walletService.getWallet();
    const hasLockPin = walletService.hasWalletLockPin();
    if (hasWallet && !hasLockPin) {
      setStep("pin_lock");
    }
  }, []);

  // Verification state
  const [shuffledWords, setShuffledWords] = useState<
    { word: string; index: number }[]
  >([]);
  const [selectedWords, setSelectedWords] = useState<
    { word: string; index: number }[]
  >([]);

  const generateNewWallet = () => {
    const randomWallet = ethers.Wallet.createRandom();
    if (!randomWallet.mnemonic) {
      setError("Failed to generate mnemonic");
      return;
    }
    setMnemonic(randomWallet.mnemonic.phrase);
    setStep("backup");
  };

  const startVerification = () => {
    const words = mnemonic.split(" ").map((word, index) => ({ word, index }));
    // Shuffle words
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
    setSelectedWords([]);
    setStep("verify");
    setError("");
  };

  const handleWordSelect = (wordObj: { word: string; index: number }) => {
    if (selectedWords.find((w) => w.index === wordObj.index)) {
      // Deselect
      setSelectedWords(selectedWords.filter((w) => w.index !== wordObj.index));
    } else {
      // Select
      setSelectedWords([...selectedWords, wordObj]);
    }
  };

  const confirmVerification = () => {
    const currentAttempt = selectedWords.map((w) => w.word).join(" ");
    if (currentAttempt === mnemonic) {
      setStep("pin_app");
      setError("");
    } else {
      setError("Invalid order. Please try again.");
      setSelectedWords([]);
    }
  };

  const handleImport = () => {
    try {
      ethers.Wallet.fromPhrase(importPhrase);
      setMnemonic(importPhrase);
      setStep("pin_app");
    } catch (e) {
      setError("Invalid seed phrase. Make sure it is 12 or 24 words.");
    }
  };

  const finalizeAppPin = () => {
    if (appPin.length !== 4) {
      setError("App PIN must be exactly 4 digits");
      return;
    }
    if (appPin !== confirmAppPin) {
      setError("PINs do not match");
      return;
    }

    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      // We encrypt the seed using this 4-digit App PIN
      const encryptedSeed = walletService.encryptSeed(mnemonic, appPin.trim());

      const btcMock = "bc1q" + wallet.address.substring(2, 40).toLowerCase();

      walletService.saveWallet({
        encryptedSeed,
        addresses: {
          eth: wallet.address,
          btcHex: btcMock,
        },
      });

      setStep("pin_lock");
      setError("");
    } catch (e) {
      setError("Failed to create wallet profile.");
    }
  };

  const finalizeLockPin = () => {
    if (lockPin.length !== 6) {
      setError("Wallet Lock PIN must be exactly 6 digits");
      return;
    }
    if (lockPin !== confirmLockPin) {
      setError("PINs do not match");
      return;
    }

    // Save as STRING and trim whitespace exactly as requested in bug fix
    walletService.saveWalletLockPin(lockPin.trim());
    onComplete();
  };

  if (step === "intro") {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-8 h-full min-h-[60vh] bg-[#0B0F1A] text-white">
        <div className="w-20 h-20 bg-[#3375BB]/10 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(51,117,187,0.3)]">
          <ShieldCheck className="w-10 h-10 text-[#3375BB]" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Your Crypto Wallet</h2>
          <p className="text-gray-400 max-w-sm mx-auto text-sm">
            A secure, self-custody wallet stored entirely on your device. You
            have total control over your funds.
          </p>
        </div>

        <div className="w-full space-y-4 pt-8 max-w-md">
          <button
            onClick={generateNewWallet}
            className="w-full py-4 bg-[#3375BB] hover:bg-[#28609a] shadow-[0_0_20px_rgba(51,117,187,0.2)] text-white rounded-2xl font-bold transition-colors"
          >
            Create New Wallet
          </button>
          <button
            onClick={() => setStep("import")}
            className="w-full py-4 bg-[#1A1F2E] hover:bg-white/10 text-white rounded-2xl font-bold transition-colors border border-white/5"
          >
            I already have a wallet
          </button>
        </div>

        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-2xl mt-4 text-sm max-w-md text-left">
          <Info className="w-6 h-6 shrink-0 mt-0.5" />
          <p>
            <strong>Crucial Security Notice:</strong> This wallet lives inside
            your browser. If you clear your browser data or lose your device,
            your wallet is gone forever.{" "}
            <strong className="text-yellow-400">
              Back up your recovery phrase safely offline.
            </strong>
          </p>
        </div>
      </div>
    );
  }

  if (step === "backup") {
    return (
      <div className="flex flex-col p-6 space-y-6 h-full min-h-[60vh] bg-[#0B0F1A] text-white">
        <h2 className="text-3xl font-bold">Secret Recovery Phrase</h2>
        <p className="text-gray-400 max-w-md text-sm">
          Write down these 12 words on a piece of paper and keep it safe.{" "}
          <strong>Never share this with anyone.</strong> Anyone with these words
          can steal your assets.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          {mnemonic.split(" ").map((word, i) => (
            <div
              key={i}
              className="bg-[#1A1F2E] p-3 rounded-xl border border-white/5 flex gap-2"
            >
              <span className="text-gray-500 text-sm select-none">{i + 1}</span>
              <span className="font-medium">{word}</span>
            </div>
          ))}
        </div>

        <button
          onClick={startVerification}
          className="w-full max-w-md py-4 mt-8 bg-[#3375BB] hover:bg-[#28609a] text-white rounded-2xl font-bold transition-colors"
        >
          I've saved it securely
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="flex flex-col p-6 space-y-6 h-full min-h-[60vh] bg-[#0B0F1A] text-white">
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-4">
          <h2 className="text-3xl font-bold">Verify Backup</h2>
          <p className="text-gray-400 max-w-sm text-sm">
            Tap the words to put them next to each other in the correct order.
          </p>
        </div>

        {/* Selected Box */}
        <div className="w-full max-w-md min-h-[140px] bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-wrap content-start gap-2">
          {selectedWords.map((w) => (
            <button
              key={w.index}
              onClick={() => handleWordSelect(w)}
              className="px-3 py-2 bg-[#3375BB] text-white rounded-lg text-sm font-medium animate-in zoom-in-95"
            >
              {w.word}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium text-center">
            {error}
          </p>
        )}

        {/* Word pool */}
        <div className="w-full max-w-md flex flex-wrap gap-2 justify-center">
          {shuffledWords.map((w) => {
            const isSelected = selectedWords.find((sw) => sw.index === w.index);
            return (
              <button
                key={w.index}
                onClick={() => !isSelected && handleWordSelect(w)}
                disabled={!!isSelected}
                className={`px-3 py-2 rounded-lg text-sm font-medium border border-white/10 transition-colors ${isSelected ? "bg-transparent text-transparent border-transparent" : "bg-[#1A1F2E] hover:bg-white/10 text-white"}`}
              >
                {w.word}
              </button>
            );
          })}
        </div>

        <button
          onClick={confirmVerification}
          disabled={selectedWords.length !== 12 && selectedWords.length !== 24}
          className="w-full max-w-md py-4 mt-8 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors"
        >
          Verify
        </button>
      </div>
    );
  }

  if (step === "import") {
    return (
      <div className="flex flex-col p-6 space-y-6 h-full min-h-[60vh] bg-[#0B0F1A] text-white">
        <h2 className="text-3xl font-bold">Import Wallet</h2>
        <p className="text-gray-400 max-w-md">
          Enter your 12 or 24-word recovery phrase to restore your wallet.
        </p>

        <textarea
          value={importPhrase}
          onChange={(e) => setImportPhrase(e.target.value)}
          placeholder="Enter secret recovery phrase..."
          className="w-full max-w-md h-32 p-4 bg-black/40 border border-white/10 rounded-2xl focus:border-[#3375BB] outline-none text-white resize-none"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleImport}
          className="w-full max-w-md py-4 mt-4 bg-[#3375BB] hover:bg-[#28609a] text-white rounded-2xl font-bold transition-colors"
        >
          Import
        </button>
      </div>
    );
  }

  if (step === "pin_app") {
    return (
      <div className="flex flex-col items-center p-6 space-y-6 mt-10 h-full min-h-[60vh] bg-[#0B0F1A] text-white">
        <h2 className="text-3xl font-bold">Set App PIN</h2>
        <p className="text-center text-gray-400 mb-8 max-w-sm text-sm">
          This 4-digit PIN secures your encrypted wallet seed.
        </p>

        <input
          type="password"
          value={appPin}
          onChange={(e) => {
            setAppPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4));
            setError("");
          }}
          placeholder="0000"
          className="w-full max-w-xs text-center text-2xl tracking-[0.5em] p-4 bg-black/40 border border-white/10 rounded-2xl focus:border-[#3375BB] outline-none"
          maxLength={4}
        />

        <input
          type="password"
          value={confirmAppPin}
          onChange={(e) => {
            setConfirmAppPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4));
            setError("");
          }}
          placeholder="0000"
          className="w-full max-w-xs text-center text-2xl tracking-[0.5em] p-4 bg-black/40 border border-white/10 rounded-2xl focus:border-[#3375BB] outline-none mt-4"
          maxLength={4}
        />

        {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

        <button
          onClick={finalizeAppPin}
          disabled={appPin.length !== 4 || confirmAppPin.length !== 4}
          className="w-full max-w-xs py-4 mt-8 bg-[#3375BB] hover:bg-[#28609a] disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors"
        >
          Next Step (1 of 2)
        </button>
      </div>
    );
  }

  if (step === "pin_lock") {
    return (
      <div className="flex flex-col items-center p-6 space-y-6 mt-10 h-full min-h-[60vh] bg-[#0B0F1A] text-white">
        <h2 className="text-3xl font-bold">Create Security PIN</h2>
        <p className="text-center text-emerald-400 mb-8 max-w-sm text-sm">
          Almost done! This 6-digit PIN acts as a lock screen to protect your
          wallet transactions when you open the app.
        </p>

        <input
          type="password"
          value={lockPin}
          onChange={(e) => {
            setLockPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            setError("");
          }}
          placeholder="000000"
          className="w-full max-w-xs text-center text-2xl tracking-[0.5em] p-4 bg-black/40 border border-white/10 rounded-2xl focus:border-emerald-500 outline-none"
          maxLength={6}
        />

        <input
          type="password"
          value={confirmLockPin}
          onChange={(e) => {
            setConfirmLockPin(
              e.target.value.replace(/[^0-9]/g, "").slice(0, 6),
            );
            setError("");
          }}
          placeholder="000000"
          className="w-full max-w-xs text-center text-2xl tracking-[0.5em] p-4 bg-black/40 border border-white/10 rounded-2xl focus:border-emerald-500 outline-none mt-4"
          maxLength={6}
        />

        {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

        <button
          onClick={finalizeLockPin}
          disabled={lockPin.length !== 6 || confirmLockPin.length !== 6}
          className="w-full max-w-xs py-4 mt-8 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-2xl font-bold transition-colors"
        >
          Secure Wallet (2 of 2)
        </button>
      </div>
    );
  }

  return null;
};
