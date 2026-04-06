import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Camera as CameraIcon, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, title = "Take a Photo" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Could not access camera. Please ensure permissions are granted.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image if using front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
          <button onClick={onClose} className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-red-500 p-4 text-center">{error}</div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}
        </div>

        <div className="p-4 flex items-center justify-center gap-6 bg-stone-50 dark:bg-stone-950">
          <button 
            onClick={toggleCamera}
            className="p-3 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
            title="Switch Camera"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
          
          <button 
            onClick={handleCapture}
            disabled={!!error}
            className="w-16 h-16 bg-[#00BFA5] rounded-full border-4 border-[#00BFA5] border-opacity-50 flex items-center justify-center hover:bg-[#00A892] transition-colors disabled:opacity-50"
            title="Take Photo"
          >
            <div className="w-12 h-12 bg-white rounded-full shadow-sm" />
          </button>
          
          <div className="w-[48px]" /> {/* Spacer for centering */}
        </div>
      </div>
    </div>
  );
};
