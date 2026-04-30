import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, X, ChevronLeft, ChevronRight, Image as ImageIcon, Type, Palette } from 'lucide-react';
import { BACKGROUND_PRESETS } from '../constants';

export const StoriesBar = () => {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [myStory, setMyStory] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  
  // Story Creator State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState<'options' | 'text' | 'image' | null>(null);
  const [storyText, setStoryText] = useState('');
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_PRESETS[1]); // Purple dream default
  const [showBgSelector, setShowBgSelector] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch stories from users I have chats with
    const fetchStories = async () => {
      // First, get all users I have chats with
      const chatsQuery = query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid));
      const chatsSnapshot = await getDocs(chatsQuery);
      
      const contactIds = new Set<string>();
      chatsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        data.participantIds.forEach((id: string) => {
          if (id !== user.uid) contactIds.add(id);
        });
      });

      const storiesQuery = query(
        collection(db, 'stories'),
        where('expiresAt', '>', new Date())
      );

      const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
        const allStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Filter and group stories
        const groupedStories = new Map<string, any>();
        let myLatestStory = null;

        allStories.forEach(story => {
          const storyTime = story.createdAt?.toMillis ? story.createdAt.toMillis() : (story.createdAt?.getTime ? story.createdAt.getTime() : Date.now());
          
          if (story.userId === user.uid) {
            const myLatestTime = myLatestStory?.createdAt?.toMillis ? myLatestStory.createdAt.toMillis() : (myLatestStory?.createdAt?.getTime ? myLatestStory.createdAt.getTime() : 0);
            if (!myLatestStory || storyTime > myLatestTime) {
              myLatestStory = story;
            }
          } else if (contactIds.has(story.userId)) {
            const existingStory = groupedStories.get(story.userId);
            const existingTime = existingStory ? (existingStory.createdAt?.toMillis ? existingStory.createdAt.toMillis() : (existingStory.createdAt?.getTime ? existingStory.createdAt.getTime() : 0)) : 0;
            if (!existingStory || storyTime > existingTime) {
              groupedStories.set(story.userId, story);
            }
          }
        });

        setMyStory(myLatestStory);
        setStories(Array.from(groupedStories.values()).sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.getTime ? a.createdAt.getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.getTime ? b.createdAt.getTime() : 0);
          return timeB - timeA;
        }));
      }, (error) => console.error('stories snapshot error:', error));

      return () => unsubscribe();
    };

    fetchStories();
  }, [user]);

  useEffect(() => {
    const handleOpenStoryCreator = () => {
      setIsCreatorOpen(true);
      setCreatorMode('options');
    };
    window.addEventListener('open-story-creator', handleOpenStoryCreator);
    return () => window.removeEventListener('open-story-creator', handleOpenStoryCreator);
  }, []);

  const handleTextStorySubmit = async () => {
    if (!storyText.trim() || !user) return;
    
    setIsUploading(true);
    try {
      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        username: profile?.username || 'User',
        userPhoto: profile?.photoURL || '',
        mediaUrl: '',
        textContent: storyText.trim(),
        backgroundClass: selectedBg.class,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      setIsCreatorOpen(false);
      setStoryText('');
    } catch (error) {
      alert('Failed to upload story');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `stories/${user.uid}/${Date.now()}.${extension}`);
      
      console.log('Uploading story to storage...');
      await uploadBytes(storageRef, file);
      console.log('Upload success');
      
      const url = await getDownloadURL(storageRef);

      console.log('Saving story to Firestore...');
      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        username: profile?.username || 'User',
        userPhoto: profile?.photoURL || '',
        mediaUrl: url,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      console.log('Firestore write success');
    } catch (error) {
      console.error('Error uploading story:', error);
      alert('Failed to upload story');
    } finally {
      setIsUploading(false);
      setIsCreatorOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const allViewableStories = myStory ? [myStory, ...stories] : stories;

  return (
    <div className="p-4 border-b border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar">
      <div className="flex gap-4">
        {/* Add Story / My Story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer relative">
          <div 
            className={`w-14 h-14 rounded-full p-[2px] ${myStory ? 'bg-gradient-to-tr from-emerald-400 to-[#00BFA5]' : 'bg-stone-200 dark:bg-stone-800'}`}
            onClick={() => myStory ? setViewingStoryIndex(0) : setIsCreatorOpen(true)}
          >
            <div className="w-full h-full rounded-full border-2 border-white dark:border-stone-950 overflow-hidden bg-stone-100 dark:bg-stone-900 flex items-center justify-center relative">
              {myStory ? (
                myStory.mediaUrl ? (
                  <img src={myStory.mediaUrl} alt="My Story" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${myStory.backgroundClass || 'bg-stone-800 text-white'}`}>
                    Aa
                  </div>
                )
              ) : profile?.photoURL ? (
                <img src={profile.photoURL} alt="Me" className="w-full h-full object-cover opacity-50" />
              ) : (
                <ImageIcon className="w-6 h-6 text-stone-400" />
              )}
              {!myStory && (
                <div className="absolute bottom-0 right-0 bg-[#00BFA5] rounded-full p-0.5 border-2 border-white dark:border-stone-950">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
          <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
            {myStory ? 'My Story' : 'Add Story'}
          </span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadStory} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Other Users' Stories */}
        {stories.map((story, index) => (
          <div 
            key={story.id} 
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => setViewingStoryIndex(myStory ? index + 1 : index)}
          >
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 to-[#00BFA5]">
              <div className="w-full h-full rounded-full border-2 border-white dark:border-stone-950 overflow-hidden bg-stone-100 dark:bg-stone-900 flex items-center justify-center">
                {story.userPhoto || story.mediaUrl ? (
                  <img src={story.userPhoto || story.mediaUrl} alt={story.username} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${story.backgroundClass || 'bg-stone-800 text-white'}`}>
                    Aa
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-stone-600 dark:text-stone-400 font-medium truncate w-16 text-center">
              {story.username}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {viewingStoryIndex !== null && (
        <StoryViewer 
          stories={allViewableStories} 
          initialIndex={viewingStoryIndex} 
          onClose={() => setViewingStoryIndex(null)} 
        />
      )}

      {/* Story Creator Modal */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-[120] bg-white dark:bg-stone-900 flex flex-col pt-safe">
          <div className="h-14 flex items-center justify-between px-4 border-b border-stone-200 dark:border-stone-800">
            <button onClick={() => {
              if (creatorMode === 'text') setCreatorMode('options');
              else setIsCreatorOpen(false);
            }} className="text-stone-900 dark:text-stone-100">
              <X className="w-6 h-6" />
            </button>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {creatorMode === 'options' ? 'Create Story' : 'Text Story'}
            </span>
            {creatorMode === 'text' ? (
              <button 
                onClick={handleTextStorySubmit}
                disabled={!storyText.trim() || isUploading}
                className="font-semibold text-[#00BFA5] disabled:opacity-50"
              >
                {isUploading ? 'Posting...' : 'Post'}
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>
          
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {creatorMode === 'options' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                <div 
                  className="w-full max-w-sm aspect-[4/5] rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                  onClick={() => setCreatorMode('text')}
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <Type className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-xl">Text Story</span>
                </div>
                
                <div 
                  className="w-full max-w-sm aspect-[4/5] rounded-3xl bg-gradient-to-br from-emerald-400 to-[#00BFA5] flex flex-col items-center justify-center text-white cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-xl">Photo Story</span>
                </div>
              </div>
            )}
            
            {creatorMode === 'text' && (
              <div className={`flex-1 flex flex-col ${selectedBg.class} transition-colors duration-300 relative`}>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Type something..."
                  className="w-full flex-1 bg-transparent text-center text-3xl font-bold p-8 focus:outline-none resize-none flex items-center justify-center placeholder:text-white/50"
                  autoFocus
                />
                
                {/* Background Selector */}
                <div className="absolute bottom-8 left-0 right-0 px-4">
                   <div className="flex gap-3 overflow-x-auto p-2 no-scrollbar scroll-smooth snap-x snap-mandatory items-center justify-center">
                     {BACKGROUND_PRESETS.map((bg) => (
                       <button
                         key={bg.id}
                         onClick={(e) => {
                           e.preventDefault();
                           setSelectedBg(bg);
                         }}
                         className={`flex-shrink-0 w-12 h-12 rounded-full border-2 snap-center transition-all ${
                           selectedBg.id === bg.id ? 'border-white scale-110 shadow-lg' : 'border-transparent scale-100 hover:scale-105'
                         } ${bg.class}`}
                         title={bg.name}
                       >
                         {bg.id === 'bg-none' && <span className="text-transparent">N</span>}
                       </button>
                     ))}
                   </div>
                </div>
              </div>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center flex-col gap-4">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white font-medium">Uploading...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StoryViewer = ({ stories, initialIndex, onClose }: { stories: any[], initialIndex: number, onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    setProgress(0);
    const duration = 5000; // 5 seconds per story
    const interval = 50; // Update progress every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentStory = stories[currentIndex];

  const handleDelete = async () => {
    if (currentStory.userId === user?.uid) {
      if (window.confirm('Delete this story?')) {
        await deleteDoc(doc(db, 'stories', currentStory.id));
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col">
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-50 ease-linear"
              style={{ 
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-800">
            {currentStory.userPhoto ? (
              <img src={currentStory.userPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-medium">
                {currentStory.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-medium shadow-sm">{currentStory.username}</p>
            <p className="text-white/70 text-xs shadow-sm">
              {currentStory.createdAt?.toDate ? currentStory.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {currentStory.userId === user?.uid && (
            <button onClick={handleDelete} className="text-white/70 hover:text-white text-sm font-medium">
              Delete
            </button>
          )}
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Navigation Areas */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-0 cursor-pointer" onClick={handlePrev} />
      <div className="absolute inset-y-0 right-0 w-2/3 z-0 cursor-pointer" onClick={handleNext} />

      {/* Content */}
      <div className={`flex-1 flex items-center justify-center p-4 relative z-[5] ${!currentStory.mediaUrl && currentStory.backgroundClass ? currentStory.backgroundClass : ''}`}>
        {currentStory.mediaUrl ? (
          <img 
            src={currentStory.mediaUrl} 
            alt="Story" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : (
          <div className="text-center p-8 max-w-full max-h-full overflow-y-auto">
            <p className="whitespace-pre-wrap text-2xl sm:text-4xl font-semibold">{currentStory.textContent}</p>
          </div>
        )}
      </div>
    </div>
  );
};
