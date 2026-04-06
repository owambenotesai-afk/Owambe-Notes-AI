import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Copy, Check, LogOut, Camera, Calendar, Mail, Circle } from 'lucide-react';

export const Settings = () => {
  const { user, logOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Validate username
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('Username can only contain letters, numbers, and underscores');
        return;
      }

      // Check if username is unique if changed
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const storageRef = ref(storage, `profile_pictures/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const batch = writeBatch(db);
      const userRef = doc(db, `users/${user.uid}`);
      const publicRef = doc(db, `users_public/${user.uid}`);

      batch.update(userRef, { photoURL: url });
      batch.update(publicRef, { photoURL: url });

      await batch.commit();
      
      setProfile({ ...profile, photoURL: url });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
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
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        {/* Header / Cover Area */}
        <div className="h-32 bg-gradient-to-r from-[#00BFA5] to-emerald-400 relative">
          <div className="absolute -bottom-16 left-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-white dark:bg-stone-800 p-1">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-12 h-12 text-stone-400 dark:text-stone-500" />
                  )}
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-2 right-2 p-2 bg-stone-900 text-white rounded-full shadow-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
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
    </div>
  );
};
