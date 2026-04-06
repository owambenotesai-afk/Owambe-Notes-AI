import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { User, Copy, Check, LogOut, Camera, Calendar, Mail, Circle, Upload, Image as ImageIcon, Shield, Edit2, X } from 'lucide-react';
import { CameraModal } from '../components/CameraModal';
import { ImageCropperModal } from '../components/ImageCropperModal';
import { SecuritySettings } from '../components/SecuritySettings';
import toast from 'react-hot-toast';

export const Settings = () => {
  const { user, logOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'profile' | 'cover' | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState<'profile' | 'cover' | null>(null);

  // Cropper state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropTarget, setCropTarget] = useState<'profile' | 'cover' | null>(null);

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

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        toast.error('Username can only contain letters, numbers, and underscores');
        return;
      }

      const newUsername = username.toLowerCase();

      if (newUsername !== profile?.username) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'users_public'), where('username', '==', newUsername));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          toast.error('Username is already taken');
          return;
        }
      }

      const { collection, query, where, getDocs, serverTimestamp } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const userRef = doc(db, `users/${user.uid}`);
      const publicRef = doc(db, `users_public/${user.uid}`);

      batch.update(userRef, { 
        username: newUsername,
        bio,
      });
      batch.update(publicRef, { 
        username: newUsername,
        bio,
      });

      // If username changed, update chats and send notifications
      if (newUsername !== profile?.username) {
        const chatsQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
        const chatsSnapshot = await getDocs(chatsQuery);

        chatsSnapshot.docs.forEach(chatDoc => {
          const chatData = chatDoc.data();
          const chatRef = doc(db, 'chats', chatDoc.id);
          
          const systemMsgText = `${profile.username} changed their username to ${newUsername}`;
          
          batch.update(chatRef, {
            [`participantNames.${user.uid}`]: newUsername,
            lastMessage: {
              text: systemMsgText,
              senderId: 'system',
              createdAt: serverTimestamp(),
              type: 'system'
            },
            updatedAt: serverTimestamp()
          });

          const messageRef = doc(collection(db, `chats/${chatDoc.id}/messages`));
          batch.set(messageRef, {
            senderId: 'system',
            text: systemMsgText,
            type: 'system',
            createdAt: serverTimestamp()
          });

          chatData.participantIds.forEach((id: string) => {
            if (id !== user.uid) {
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, {
                userId: id,
                type: 'username_change',
                message: systemMsgText,
                read: false,
                createdAt: serverTimestamp()
              });
            }
          });
        });
      }

      await batch.commit();
      
      toast.success('Profile updated successfully');
      setProfile({ ...profile, username: newUsername, bio });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to update profile');
    }
  };

  const cancelEdit = () => {
    setUsername(profile?.username || '');
    setBio(profile?.bio || '');
    setIsEditing(false);
  };

  const saveCroppedImage = async (base64Url: string) => {
    if (!user || !cropTarget) return;
    try {
      setUploading(true);
      setIsCropperOpen(false);
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const userRef = doc(db, `users/${user.uid}`);
      const publicRef = doc(db, `users_public/${user.uid}`);

      const updateData = cropTarget === 'profile' ? { photoURL: base64Url } : { coverURL: base64Url };
      batch.update(userRef, updateData);
      batch.update(publicRef, updateData);

      if (cropTarget === 'profile') {
        const chatsQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
        const chatsSnapshot = await getDocs(chatsQuery);

        chatsSnapshot.docs.forEach(chatDoc => {
          const chatRef = doc(db, 'chats', chatDoc.id);
          batch.update(chatRef, {
            [`participantPhotos.${user.uid}`]: base64Url
          });
        });
      }

      await batch.commit();
      
      setProfile({ ...profile, ...updateData });
      toast.success(`${cropTarget === 'profile' ? 'Profile' : 'Cover'} photo updated!`);
    } catch (error) {
      console.error(`Error uploading ${cropTarget} image:`, error);
      toast.error(`Failed to update ${cropTarget} photo`);
    } finally {
      setUploading(false);
      setCropTarget(null);
      setCropImageSrc('');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropTarget(type);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
    setShowPhotoOptions(null);
  };

  const handleCameraCapture = (file: File) => {
    if (cameraTarget) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropTarget(cameraTarget);
        setIsCropperOpen(true);
        setIsCameraOpen(false);
        setCameraTarget(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyUserId = () => {
    const userIdToCopy = profile?.userId;
    if (userIdToCopy) {
      navigator.clipboard.writeText(userIdToCopy);
      setCopied(true);
      toast.success('User ID copied to clipboard');
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
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 space-y-6">
      {/* Tabs */}
      <div className="flex bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl w-full max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'profile' 
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm' 
              : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <User className="w-4 h-4" /> Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'security' 
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm' 
              : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Shield className="w-4 h-4" /> Security
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden transition-all">
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
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => { coverInputRef.current?.click(); }}
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
              onChange={(e) => handleImageSelect(e, 'cover')} 
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
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2">
                    <button 
                      onClick={() => { fileInputRef.current?.click(); }}
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
                  onChange={(e) => handleImageSelect(e, 'profile')} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          <div className="pt-20 px-8 pb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
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
              
              <div className="flex gap-2">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 text-sm font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={cancelEdit}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium transition-colors"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00BFA5] text-white hover:bg-[#00A892] text-sm font-medium transition-colors"
                    >
                      <Check className="w-4 h-4" /> Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Username</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100 transition-all"
                  />
                ) : (
                  <div className="w-full bg-stone-50 dark:bg-stone-900/50 border border-transparent rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-stone-100">
                    {profile?.username}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Bio</label>
                  {isEditing && (
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {bio.length}/150
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={150}
                    placeholder="Write a little about yourself..."
                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none dark:text-stone-100 resize-none transition-all"
                  />
                ) : (
                  <div className="w-full bg-stone-50 dark:bg-stone-900/50 border border-transparent rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-stone-100 min-h-[80px]">
                    {profile?.bio || <span className="text-stone-400 italic">No bio provided</span>}
                  </div>
                )}
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

              <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(profile?.createdAt)}
                </div>
                
                <button 
                  onClick={logOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <SecuritySettings />
      )}

      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setCameraTarget(null);
        }}
        onCapture={handleCameraCapture}
        title={cameraTarget === 'profile' ? "Take Profile Photo" : "Take Cover Photo"}
      />

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false);
          setCropTarget(null);
          setCropImageSrc('');
        }}
        imageSrc={cropImageSrc}
        onCropComplete={saveCroppedImage}
        aspectRatio={cropTarget === 'profile' ? 1 : 16 / 9}
        shape={cropTarget === 'profile' ? 'round' : 'rect'}
      />
    </div>
  );
};

