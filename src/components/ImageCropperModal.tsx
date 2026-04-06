import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '../lib/cropImage';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  aspectRatio: number;
  shape?: 'rect' | 'round';
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio,
  shape = 'rect'
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    
    try {
      setIsCropping(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCropping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-stone-900 rounded-3xl overflow-hidden shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Crop Image</h2>
          <button onClick={onClose} className="p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative w-full h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={shape}
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-6 bg-stone-50 dark:bg-stone-950 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-stone-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#00BFA5]"
            />
            <ZoomIn className="w-5 h-5 text-stone-500" />
          </div>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isCropping}
              className="flex items-center gap-2 bg-[#00BFA5] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#00A892] transition-colors disabled:opacity-50"
            >
              {isCropping ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
