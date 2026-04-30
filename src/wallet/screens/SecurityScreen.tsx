import React, { useState } from "react";
import { ChevronLeft, Shield, Eye, LogOut, Trash2, Key, CheckCircle, AlertTriangle } from "lucide-react";
import { walletService } from "../services/walletService";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export const SecurityScreen = ({ onClose, onLogout }: { onClose: () => void, onLogout: () => void }) => {
  const [showPinChange, setShowPinChange] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedPin, setSeedPin] = useState("");
  const [seedError, setSeedError] = useState("");
  const [revealedSeed, setRevealedSeed] = useState("");
  const { logOut: firebaseLogOut } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Pin Change State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  const handleChangePin = () => {
    setPinError("");
    setPinSuccess("");

    if (!walletService.verifyWalletLockPin(currentPin.trim())) {
      setPinError("Current PIN is incorrect.");
      return;
    }

    if (newPin.length !== 6) {
      setPinError("New PIN must be exactly 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("New PINs do not match.");
      return;
    }

    walletService.saveWalletLockPin(newPin.trim());
    setPinSuccess("PIN successfully updated.");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");

    setTimeout(() => {
      setShowPinChange(false);
      setPinSuccess("");
    }, 2000);
  };

  const handleRevealSeed = () => {
    setSeedError("");
    if (seedPin.length < 6) {
      setSeedError("Enter your 6-digit PIN.");
      return;
    }

    if (!walletService.verifyWalletLockPin(seedPin.trim())) {
      setSeedError("Incorrect PIN.");
      return;
    }

    const wallet = walletService.getWallet();
    if (wallet) {
      const decrypted = walletService.decryptSeed(wallet.encryptedSeed, seedPin.trim());
      if (decrypted) {
        setRevealedSeed(decrypted);
        setShowSeed(true);
      } else {
        setSeedError("Failed to decrypt seed.");
      }
    }
    setSeedPin("");
  };

  const handleDeleteAccount = () => {
    walletService.clearWallet();
    // Use window.location.reload to completely destroy state? Or just fire onLogout which goes back to Wallet setup eventually?
    // But onLogout sets isLocked to true, which brings AppLock. When AppLock receives unlock, it goes to Wallet screen but Wallet is cleared. 
    // Usually clearWallet requires app reload or deep reset. Let's just clear and reload the page for a clean slate.
    window.location.reload();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3, ease: "easeOut" }} className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full">
      <div className="flex items-center p-4 border-b border-white/5 bg-[#121826]/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onClose} className="mr-3 text-gray-400 hover:text-emerald-400 transition-colors flex items-center p-1 rounded-full hover:bg-white/5">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          Security
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6 pb-28">
        
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 px-1">Access Control</h3>
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
            
            {showPinChange ? (
              <div className="p-4 space-y-4">
                <button onClick={() => setShowPinChange(false)} className="text-emerald-400 text-sm font-medium mb-2">← Back</button>
                <div className="space-y-3">
                  <input type="password" maxLength={6} placeholder="Current 6-Digit PIN" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-white tracking-widest text-center" />
                  <input type="password" maxLength={6} placeholder="New 6-Digit PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-white tracking-widest text-center" />
                  <input type="password" maxLength={6} placeholder="Confirm New PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none text-white tracking-widest text-center" />
                  {pinError && <p className="text-red-400 text-xs text-center flex justify-center items-center gap-1"><AlertTriangle className="w-3 h-3" /> {pinError}</p>}
                  {pinSuccess && <p className="text-emerald-400 text-xs text-center flex justify-center items-center gap-1"><CheckCircle className="w-3 h-3" /> {pinSuccess}</p>}
                  <button onClick={handleChangePin} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">Save New PIN</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowPinChange(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm text-white">Change Security PIN</p>
                    <p className="text-xs text-gray-500">Update your 6-digit lock screen PIN</p>
                  </div>
                </div>
              </button>
            )}

                        <button onClick={onLogout} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Lock Session</p>
                  <p className="text-xs text-gray-500">Require PIN to re-enter</p>
                </div>
              </div>
            </button>
            <button onClick={firebaseLogOut} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Log Out</p>
                  <p className="text-xs text-gray-500">Sign out of app account</p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 px-1">Recovery & Backup</h3>
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden p-4">
            {!showSeed ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm text-white">View Passphrase</p>
                    <p className="text-xs text-gray-500">Requires PIN to reveal</p>
                  </div>
                </div>
                <input type="password" maxLength={6} placeholder="Enter your PIN" value={seedPin} onChange={(e) => setSeedPin(e.target.value.replace(/[^0-9]/g, ""))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none text-white tracking-widest text-center" />
                {seedError && <p className="text-red-400 text-xs text-center flex justify-center items-center gap-1"><AlertTriangle className="w-3 h-3" /> {seedError}</p>}
                <button onClick={handleRevealSeed} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors">Reveal Passphrase</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl relative">
                   <p className="text-center font-mono text-sm leading-relaxed text-red-200 select-all">{revealedSeed}</p>
                </div>
                <p className="text-xs text-center text-red-400 uppercase tracking-widest font-bold">Never share this with anyone!</p>
                <button onClick={() => { setShowSeed(false); setRevealedSeed(""); setSeedPin(""); }} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors">Hide Secret</button>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="bg-white/5 border border-red-500/10 rounded-3xl overflow-hidden">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center p-4 hover:bg-red-500/10 transition-colors text-red-400 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center group-hover:bg-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Delete Account Details</p>
                    <p className="text-xs text-red-400/70">Wipe this device's wallet data</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="p-4">
                <p className="text-sm text-red-400 font-bold mb-2">Are you sure?</p>
                <p className="text-xs text-gray-400 mb-4">If you haven't backed up your passphrase, your funds will be lost forever. This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors">Cancel</button>
                  <button onClick={handleDeleteAccount} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]">Yes, Erase Data</button>
                </div>
              </div>
            )}
          </div>
        </section>

            </div>
    </motion.div>
  );
};
