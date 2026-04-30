import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";

export const QrScannerModal = ({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (text: string) => void;
}) => {
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false,
    );
    html5QrcodeScanner.render(
      (text) => {
        onScan(text);
        if (html5QrcodeScanner) {
          // html5QrcodeScanner.clear();
        }
      },
      (err) => {
        // Ignore routine scan errors
      },
    );

    return () => {
      html5QrcodeScanner.clear().catch((error) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1A1F2E] w-full max-w-md p-6 rounded-3xl shadow-xl flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-6 text-white">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Camera className="w-6 h-6" /> Scan QR Code
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px] border border-white/10">
          <div id="qr-reader" className="w-full text-white"></div>
        </div>
        {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
      </div>
    </div>
  );
};
