import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { X, User, Calendar, Circle } from 'lucide-react';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export const UserProfileModal = ({ userId, onClose }: UserProfileModalProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, `users_public/${userId}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFA5] mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
        <div 
          className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Cover Photo */}
          <div className="h-32 bg-gradient-to-r from-[#00BFA5] to-emerald-400 relative">
            {profile.coverURL && (
              <img src={profile.coverURL} alt="Cover" className="w-full h-full object-cover cursor-pointer" onClick={() => setFullScreenImage(profile.coverURL)} />
            )}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 relative">
            <div className="absolute -top-12 left-6">
              <div 
                className="w-24 h-24 rounded-full border-4 border-white dark:border-stone-900 bg-stone-100 dark:bg-stone-800 overflow-hidden cursor-pointer"
                onClick={() => profile.photoURL && setFullScreenImage(profile.photoURL)}
              >
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-stone-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-14">
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                @{profile.username}
              </h2>
              
              <div className="flex items-center gap-2 mt-1 text-sm text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Circle className={`w-3 h-3 fill-current ${profile.online ? 'text-emerald-500' : 'text-stone-400'}`} />
                  {profile.online ? 'Online' : 'Offline'}
                </span>
              </div>

              {profile.bio && (
                <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl">
                  <p className="text-stone-700 dark:text-stone-300 text-sm whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <Calendar className="w-4 h-4" />
                Joined {formatDate(profile.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full"
            onClick={() => setFullScreenImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full screen" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
