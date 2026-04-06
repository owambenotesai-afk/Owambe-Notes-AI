import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Copy, Check, LogOut, Camera, Calendar, Mail, Circle, Upload, Image as ImageIcon } from 'lucide-react';
import { CameraModal } from '../components/CameraModal';

export const Settings = () => {
  const { user, logOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'profile' | 'cover' | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState<'profile' | 'cover' | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, `users/${user.uid}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setUsername(data.username || '');
          setBio(data.bio || '');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('Username can only contain letters, numbers, and underscores');
        return;
      }

      if (username !== profile?.username) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'users_public'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert('Username is already taken');
          return;
        }
      }

      const batch = writeBatch(db);
      const userRef = doc(db, `users/${user.uid}`);
      const publicRef = doc(db, `users_public/${user.uid}`);

      batch.update(userRef, { 
        username: username.toLowerCase(),
        bio,
      });
      batch.update(publicRef, { 
        username: username.toLowerCase(),
        bio,
      });

      await batch.commit();
      
      alert('Profile updated successfully');
      setProfile({ ...profile, username: username.toLowerCase(), bio });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const uploadPhoto = async (file: File, type: 'profile' | 'cover') => {
    if (!user) return;
    try {
      setUploading(true);
      
      // Resize image and convert to base64
      const base64Url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Max dimensions
            const MAX_WIDTH = type === 'profile' ? 400 : 1200;
            const MAX_HEIGHT = type === 'profile' ? 400 : 800;
            
            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.7 quality to keep size small
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // Check size (Firestore limit is 1MB, we want to stay well below, e.g., < 800KB)
            // Base64 size is roughly string length * (3/4)
            if (dataUrl.length * 0.75 > 800000) {
                reject(new Error('Image is too large even after compression.'));
                return;
            }
            
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const batch = writeBatch(db);
      const userRef = doc(db, `users/${user.uid}`);
      const publicRef = doc(db, `users_public/${user.uid}`);

      const updateData = type === 'profile' ? { photoURL: base64Url } : { coverURL: base64Url };
      batch.update(userRef, updateData);
      batch.update(publicRef, updateData);

      await batch.commit();
      
      setProfile({ ...profile, ...updateData });
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      alert(`Failed to upload ${type} image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setShowPhotoOptions(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPhoto(file, type);
    }
    // Reset input so the same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const copyUserId = () => {
    const userIdToCopy = profile?.userId;
    if (userIdToCopy) {
      navigator.clipboard.writeText(userIdToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500 dark:text-stone-400">Loading profile...</div>;

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {/* Header / Cover Area */}
        <div className="h-48 bg-gradient-to-r from-[#00BFA5] to-emerald-400 relative group">
          {profile?.coverURL && (
            <img src={profile.coverURL} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          )}
          
          {/* Cover Photo Button */}
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => setShowPhotoOptions(showPhotoOptions === 'cover' ? null : 'cover')}
              disabled={uploading}
              className="p-2 bg-black/50 text-white rounded-full shadow-lg hover:bg-black/70 backdrop-blur-sm transition-colors disabled:opacity-50"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            
            {showPhotoOptions === 'cover' && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-10">
                <button 
                  onClick={() => { coverInputRef.current?.click(); setShowPhotoOptions(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-left"
                >
                  <Upload className="w-4 h-4" /> Upload Photo
                </button>
                <button 
                  onClick={() => { setCameraTarget('cover'); setIsCameraOpen(true); setShowPhotoOptions(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-left border-t border-stone-100 dark:border-stone-700"
                >
                  <Camera className="w-4 h-4" /> Take Photo
                </button>
              </div>
            )}
          </div>

          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={(e) => handleImageUpload(e, 'cover')} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="absolute -bottom-16 left-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-white dark:bg-stone-900 p-1 shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-12 h-12 text-stone-400 dark:text-stone-500" />
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setShowPhotoOptions(showPhotoOptions === 'profile' ? null : 'profile')}
                disabled={uploading}
                className="absolute bottom-2 right-2 p-2 bg-stone-900 text-white rounded-full shadow-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>

              {showPhotoOptions === 'profile' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-10">
                  <button 
                    onClick={() => { fileInputRef.current?.click(); setShowPhotoOptions(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-left"
                  >
                    <Upload className="w-4 h-4" /> Upload Photo
                  </button>
                  <button 
                    onClick={() => { setCameraTarget('profile'); setIsCameraOpen(true); setShowPhotoOptions(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors text-left border-t border-stone-100 dark:border-stone-700"
                  >
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>
                </div>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => handleImageUpload(e, 'profile')} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
        </div>

        <div className="pt-20 px-8 pb-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                @{profile?.username}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Circle className={`w-3 h-3 fill-current ${profile?.online ? 'text-emerald-500' : 'text-stone-400'}`} />
                  {profile?.online ? 'Online' : profile?.lastSeen ? `Last seen ${formatDate(profile.lastSeen)}` : 'Offline'}
                </span>
              </div>
            </div>
            <button 
              onClick={logOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Write a little about yourself..."
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">User ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile?.userId || ''}
                    disabled
                    className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-500 dark:text-stone-400 cursor-not-allowed outline-none font-mono"
                  />
                  <button 
                    onClick={copyUserId}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                    title="Copy User ID"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-10 pr-4 py-3 text-sm text-stone-500 dark:text-stone-400 cursor-not-allowed outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 pt-4 border-t border-stone-100 dark:border-stone-800">
              <Calendar className="w-4 h-4" />
              Joined {formatDate(profile?.createdAt)}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-[#00BFA5] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#00A892] transition-colors w-full sm:w-auto"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setCameraTarget(null);
        }}
        onCapture={(file) => {
          if (cameraTarget) {
            uploadPhoto(file, cameraTarget);
          }
        }}
        title={cameraTarget === 'profile' ? "Take Profile Photo" : "Take Cover Photo"}
      />
    </div>
  );
};

