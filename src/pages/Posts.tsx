import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, updateDoc, increment, deleteDoc, setDoc, serverTimestamp, where, limit, startAfter, getDocs } from 'firebase/firestore';
import { Image as ImageIcon, Send, Heart, MessageCircle, MoreVertical, X, Share2, Palette, Plus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../firebase';
import { BACKGROUND_PRESETS } from '../constants';

const PostItem = ({ post, user, profile, likedPosts, handleLike, setShareModalPost, handleCopyText, handleRepost, handleDeletePost, onOpenProfile, onOpenLikers }: any) => {
  const [likers, setLikers] = useState<any[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, `posts/${post.id}/likes`), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const likersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setLikers(likersData);
    });
    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    if (!showComments) return;
    const q = query(collection(db, `posts/${post.id}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentsData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const populated = await Promise.all(commentsData.map(async (c: any) => {
         if (!c.authorUsername) {
           try {
             const uDoc = await getDoc(doc(db, 'users_public', c.authorId));
             if (uDoc.exists()) {
               c.authorUsername = uDoc.data().username;
               c.authorPhoto = uDoc.data().photoURL;
             }
           } catch(e){}
         }
         return c;
      }));
      setComments(populated);
    });
    return () => unsubscribe();
  }, [post.id, showComments]);

  const handleCommentSubmit = async () => {
      if (!newCommentText.trim() || !user || isCommenting) return;
      setIsCommenting(true);
      try {
        await addDoc(collection(db, `posts/${post.id}/comments`), {
          authorId: user.uid,
          authorUsername: profile?.username || 'Unknown',
          authorPhoto: profile?.photoURL || '',
          content: newCommentText.trim(),
          parentId: replyingTo?.id || null,
          likesCount: 0,
          likedBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'posts', post.id), { commentsCount: increment(1) });
        
        if (post.authorId && post.authorId !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: post.authorId,
            type: 'comment',
            actorId: user.uid,
            postId: post.id,
            content: newCommentText.trim(),
            read: false,
            createdAt: serverTimestamp()
          });
        }
        
        setNewCommentText('');
        setReplyingTo(null);
        setShowComments(true);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `posts/${post.id}/comments`);
      } finally {
        setIsCommenting(false);
      }
  };

  const handleLikeComment = async (comment: any) => {
    if (!user) return;
    const isLiked = comment.likedBy?.includes(user.uid);
    const commentRef = doc(db, `posts/${post.id}/comments`, comment.id);
    try {
      if (isLiked) {
        await updateDoc(commentRef, {
          likedBy: (comment.likedBy || []).filter((uid: string) => uid !== user.uid),
          likesCount: Math.max(0, (comment.likesCount || 0) - 1)
        });
      } else {
        await updateDoc(commentRef, {
          likedBy: [...(comment.likedBy || []), user.uid],
          likesCount: (comment.likesCount || 0) + 1
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `posts/${post.id}/comments/${comment.id}`);
    }
  };

  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesByParent = comments.filter(c => c.parentId).reduce((acc, c) => {
     if (!acc[c.parentId]) acc[c.parentId] = [];
     acc[c.parentId].push(c);
     return acc;
  }, {} as Record<string, any[]>);

  const renderComment = (c: any, isReply = false) => {
    const isCommentLiked = c.likedBy?.includes(user?.uid) || false;
    return (
      <div key={c.id} className={`flex gap-3 ${isReply ? 'mt-2' : 'mt-4'}`}>
        <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden shrink-0 mt-1 cursor-pointer" onClick={() => onOpenProfile(c.authorId)}>
           {c.authorPhoto ? <img src={c.authorPhoto} loading="lazy" className="w-full h-full object-cover" /> : null}
        </div>
        <div className="flex-1">
           <div className="bg-stone-100 dark:bg-stone-800/80 px-3 py-2 rounded-2xl rounded-tl-sm inline-block max-w-full">
              <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-0.5 cursor-pointer hover:underline" onClick={() => onOpenProfile(c.authorId)}>{c.authorUsername || 'Unknown'}</h4>
              <p className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap">{c.content}</p>
           </div>
           <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-stone-500 font-medium tracking-wide">
              <span>{c.createdAt?.toDate?.() ? new Date(c.createdAt.toDate()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
              <button onClick={() => handleLikeComment(c)} className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors flex items-center gap-1 ${isCommentLiked ? 'text-red-500' : ''}`}>
                <Heart className={`w-3 h-3 ${isCommentLiked ? 'fill-current' : ''}`} /> {c.likesCount || 0}
              </button>
              <button onClick={() => { setReplyingTo({ id: isReply ? c.parentId : c.id, username: c.authorUsername }); document.getElementById(`comment-input-${post.id}`)?.focus(); }} className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                Reply
              </button>
           </div>
           {!isReply && repliesByParent[c.id] && (
              <div className="pl-4 border-l-2 border-stone-100 dark:border-stone-800 mt-2 space-y-2">
                 {repliesByParent[c.id].map((reply: any) => renderComment(reply, true))}
              </div>
           )}
        </div>
      </div>
    );
  };

  const bgClass = post.backgroundClass || 'bg-transparent text-stone-900 dark:text-stone-100';
  const hasBackground = post.backgroundId && post.backgroundId !== 'bg-none';
  const isLiked = likedPosts.has(post.id);
  const isOwner = user?.uid === (post.authorId || post.userId);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
       <div className="p-4 flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
             <div 
               onClick={() => onOpenProfile(post.authorId || post.userId)}
               className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden cursor-pointer"
             >
               {post.authorInfo?.photoURL ? <img src={post.authorInfo.photoURL} loading="lazy" className="w-full h-full object-cover" /> : null}
             </div>
             <div>
               <h4 
                 onClick={() => onOpenProfile(post.authorId || post.userId)}
                 className="font-bold text-sm text-stone-900 dark:text-stone-100 cursor-pointer hover:underline"
               >
                 {post.authorInfo?.username || post.username || 'Unknown'}
               </h4>
               <span className="text-xs text-stone-500">{post.createdAt?.toDate?.() ? new Date(post.createdAt.toDate()).toLocaleString() : 'Just now'}</span>
             </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-10">
                {isOwner ? (
                  <>
                    <button onClick={() => { setShowMenu(false); alert('Editing post is coming soon!'); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                      Edit Post
                    </button>
                    <button onClick={() => { setShowMenu(false); handleDeletePost(post.id); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                      Delete Post
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setShowMenu(false); handleCopyText(post.content); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                      Copy Text
                    </button>
                    <button onClick={() => { setShowMenu(false); setShareModalPost(post); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                      Share to Chat / Story
                    </button>
                    <button onClick={() => { setShowMenu(false); handleRepost(post); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                      Repost
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
       </div>
       
       <div className={`${hasBackground && !(post.photoURLs?.length) && !post.photoURL ? `${bgClass} p-8 min-h-[200px] flex items-center justify-center text-center text-xl font-medium` : 'px-4 pb-2'}`}>
         <p className={`${hasBackground && !(post.photoURLs?.length) && !post.photoURL ? '' : 'text-stone-800 dark:text-stone-200'} whitespace-pre-wrap`}>
           {post.content}
         </p>
       </div>

       {(post.photoURLs && post.photoURLs.length > 0) ? (
          <div className="bg-stone-100 dark:bg-stone-800 border-y border-stone-200 dark:border-stone-700 p-1">
            <div className={`grid gap-1 ${post.photoURLs.length === 1 ? 'grid-cols-1' : post.photoURLs.length === 2 ? 'grid-cols-2' : post.photoURLs.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {post.photoURLs.map((url: string, index: number) => (
                <img key={index} src={url} loading="lazy" alt="Post content" className={`w-full object-cover rounded-lg ${post.photoURLs.length === 1 ? 'max-h-[500px] object-contain' : post.photoURLs.length === 3 && index === 0 ? 'col-span-2 max-h-[300px]' : 'h-48'}`} />
              ))}
            </div>
          </div>
       ) : post.photoURL && (
          <div className="bg-stone-100 dark:bg-stone-800 border-y border-stone-200 dark:border-stone-700">
            <img src={post.photoURL} loading="lazy" alt="Post" className="w-full max-h-[500px] object-contain" />
          </div>
       )}
       
       <div className="p-4">
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2" onClick={() => onOpenLikers(post.id)} role="button">
             <div className="flex -space-x-1.5 border-r border-stone-200 dark:border-stone-700 pr-3 mr-1 cursor-pointer">
               {likers.slice(0, 3).map((liker, i) => (
                 <div key={liker.id} className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-stone-900 bg-stone-200 dark:bg-stone-700 overflow-hidden hover:scale-110 transition-transform" style={{ zIndex: 3 - i }}>
                    {liker.userPhoto ? <img src={liker.userPhoto} loading="lazy" className="w-full h-full object-cover" /> : null}
                 </div>
               ))}
               {likers.length === 0 && <Heart className="w-4 h-4 text-stone-400 mt-0.5" />}
             </div>
             <span className="text-stone-500 text-sm font-medium cursor-pointer hover:underline">{post.likesCount || likers.length || 0}</span>
           </div>
           <div className="text-stone-500 text-sm font-medium cursor-pointer hover:underline" onClick={() => setShowComments(!showComments)}>
             {post.commentsCount || 0} comments
           </div>
         </div>
         <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button onClick={() => handleLike(post.id, post.authorId || post.userId)} className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg transition-colors ${isLiked ? 'text-red-500' : 'text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800'}`}>
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">Like</span>
            </button>
            <button onClick={() => { setShowComments(!showComments); setTimeout(() => document.getElementById(`comment-input-${post.id}`)?.focus(), 100); }} className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Comment</span>
            </button>
            <button onClick={() => setShareModalPost(post)} className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Share</span>
            </button>
         </div>

         {/* Comments Area Inline */}
         {showComments && (
           <div className="mt-4 pt-2 border-t border-stone-100 dark:border-stone-800 animate-in fade-in slide-in-from-top-2 duration-300">
             
             {comments.length > 0 ? (
               <div className="space-y-4 mb-4 max-h-80 overflow-y-auto px-1 scrollbar-hide">
                 {topLevelComments.map(c => renderComment(c, false))}
               </div>
             ) : (
               <div className="text-center py-4 text-stone-500 text-sm">No comments yet. Be the first!</div>
             )}

             {/* Comment Input */}
             {replyingTo && (
               <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-t-xl text-xs text-stone-500">
                 <span>Replying to <span className="font-semibold text-stone-700 dark:text-stone-300">@{replyingTo.username}</span></span>
                 <button onClick={() => setReplyingTo(null)} className="hover:text-stone-900 dark:hover:text-stone-100"><X className="w-3 h-3" /></button>
               </div>
             )}
             <div className={`flex items-end gap-2 bg-stone-100 dark:bg-stone-800 p-2 ${replyingTo ? 'rounded-b-xl' : 'rounded-2xl'}`}>
               <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden shrink-0 self-end mb-1 ml-1">
                 {profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : null}
               </div>
               <textarea 
                 id={`comment-input-${post.id}`}
                 value={newCommentText}
                 onChange={(e) => setNewCommentText(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleCommentSubmit();
                   }
                 }}
                 placeholder="Write a comment..."
                 className="flex-1 bg-transparent border-none px-2 focus:ring-0 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 resize-none max-h-32 min-h-[40px] py-2"
                 rows={1}
               />
               <button 
                 onClick={handleCommentSubmit}
                 disabled={!newCommentText.trim() || isCommenting}
                 className="p-2 mb-1 mr-1 bg-[#00BFA5] hover:bg-[#009688] disabled:opacity-50 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:text-stone-500 text-white rounded-full transition-colors self-end shrink-0"
               >
                 {isCommenting ? <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin ml-0.5" /> : <Send className="w-4 h-4 ml-0.5" />}
               </button>
             </div>
           </div>
         )}
       </div>
    </div>
  );
};

const PostSkeleton = () => (
  <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden animate-pulse">
    <div className="p-4 flex items-center justify-between mb-1">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800"></div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded"></div>
          <div className="h-3 w-16 bg-stone-200 dark:bg-stone-800 rounded"></div>
        </div>
      </div>
    </div>
    <div className="px-4 pb-4">
      <div className="h-16 w-full bg-stone-200 dark:bg-stone-800 rounded mb-4"></div>
      <div className="h-10 w-full bg-stone-200 dark:bg-stone-800 rounded"></div>
    </div>
  </div>
);

export const Posts = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [masterPosts, setMasterPosts] = useState<any[]>([]);
  const [pool, setPool] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeLikersPost, setActiveLikersPost] = useState<string | null>(null);
  const [likersList, setLikersList] = useState<any[]>([]);
  const [isLiking, setIsLiking] = useState(false);
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_PRESETS[0]);
  const [showBgSelector, setShowBgSelector] = useState(false);
  
  const [shareModalPost, setShareModalPost] = useState<any | null>(null);
  const [shareChats, setShareChats] = useState<any[]>([]);
  const [isSharingToChat, setIsSharingToChat] = useState(false);

  useEffect(() => {
    const handleOpenComposer = () => setIsComposerOpen(true);
    window.addEventListener('open-composer', handleOpenComposer);
    return () => window.removeEventListener('open-composer', handleOpenComposer);
  }, []);

  useEffect(() => {
    if (!shareModalPost || !user) return;
    const unsubscribe = onSnapshot(query(collection(db, 'chats'), where('participantIds', 'array-contains', user.uid)), (snap) => {
      setShareChats(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    return () => unsubscribe();
  }, [shareModalPost, user]);

  const handleShareToStory = async () => {
    if (!user || !shareModalPost) return;
    try {
      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        username: profile?.username || 'User',
        userPhoto: profile?.photoURL || '',
        mediaUrl: shareModalPost.photoURL || '',
        textContent: shareModalPost.content || '',
        backgroundClass: shareModalPost.backgroundClass || '',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      alert('Shared to your story!');
      setShareModalPost(null);
    } catch (error) {
      alert('Failed to share to story');
    }
  };

  const handleShareToChat = async (chat: any) => {
    if (!user || !shareModalPost) return;
    try {
      const summary = `Shared a post: ${shareModalPost.content.substring(0, 50)}${shareModalPost.content.length > 50 ? '...' : ''}`;
      await addDoc(collection(db, `chats/${chat.id}/messages`), {
        text: summary,
        senderId: user.uid,
        attachments: shareModalPost.photoURL ? [{ url: shareModalPost.photoURL, type: 'image' }] : [],
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: summary,
        lastMessageTime: serverTimestamp(),
        unreadCount: increment(1)
      });
      alert('Shared to chat!');
      setShareModalPost(null);
      setIsSharingToChat(false);
    } catch (error) {
      alert('Failed to share to chat');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (postImages.length + files.length > 4) {
       alert("You can only upload up to 4 images per post.");
       return;
    }
    files.forEach(file => {
      if (file.size > 1048576) {
         alert("Image is too large. Please use an image under 1MB.");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImages(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, reader.result as string];
        });
        setSelectedBg(BACKGROUND_PRESETS[0]);
      };
      reader.readAsDataURL(file);
    });
  };

  const fetchPosts = async (isInitial = false) => {
    if (!user) return;
    
    if (isInitial) {
      setLoading(true);
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setLoading(false);
          setHasMore(false);
          return;
        }

        const postsData = [];
        const likesData = new Set<string>();
        
        for (const docSnap of snapshot.docs) {
          const post = { id: docSnap.id, ...docSnap.data() } as any;
          try {
            const likeRef = await getDoc(doc(db, `posts/${docSnap.id}/likes`, user.uid));
            if (likeRef.exists()) likesData.add(docSnap.id);
          } catch(e) {}
          try {
             const authorRef = await getDoc(doc(db, 'users_public', post.authorId || post.userId));
             if (authorRef.exists()) post.authorInfo = authorRef.data();
          } catch(e) {}
          postsData.push(post);
        }

        const shuffled = [...postsData].sort(() => Math.random() - 0.5);
        setMasterPosts([...postsData]);
        
        const initialBatch = shuffled.slice(0, 10).map(p => ({ ...p, feedId: p.id + '-' + Math.random().toString(36).substring(7) }));
        setPosts(initialBatch);
        setPool(shuffled.slice(10));
        setLikedPosts(likesData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      if (loadingMore || masterPosts.length === 0) return;
      setLoadingMore(true);
      
      setTimeout(() => {
        let currentPool = [...pool];
        if (currentPool.length < 10) {
           const reshuffled = [...masterPosts].sort(() => Math.random() - 0.5);
           currentPool = [...currentPool, ...reshuffled];
        }
        
        const nextBatch = currentPool.slice(0, 10).map(p => ({ ...p, feedId: p.id + '-' + Math.random().toString(36).substring(7) }));
        setPool(currentPool.slice(10));
        setPosts(prev => [...prev, ...nextBatch]);
        setLoadingMore(false);
      }, 500);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPosts(true);
    }
  }, [user]);

  const handlePostSubmit = async () => {
    if (!newPostText.trim() && postImages.length === 0) return;
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user?.uid,
        authorId: user?.uid,
        username: profile?.username || 'Unknown',
        content: newPostText.trim(),
        photoURL: postImages.length > 0 ? postImages[0] : null,
        photoURLs: postImages,
        backgroundId: selectedBg.id,
        backgroundClass: selectedBg.class,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewPostText('');
      setPostImages([]);
      setSelectedBg(BACKGROUND_PRESETS[0]);
      setIsComposerOpen(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'posts');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const handleRepost = async (post: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        authorId: user.uid,
        username: profile?.username || 'Unknown',
        content: `Reposting: ${post.content}`,
        photoURL: post.photoURL || null,
        photoURLs: post.photoURLs || [],
        backgroundId: post.backgroundId || 'bg-none',
        backgroundClass: post.backgroundClass || '',
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert('Reposted successfully!');
      // Fetch posts will naturally pick this up if we are at top, else we might need to prepend or refresh.
      fetchPosts(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'posts');
    }
  };

  useEffect(() => {
    if (!activeLikersPost) return;
    const fetchLikers = async () => {
      const q = query(collection(db, `posts/${activeLikersPost}/likes`), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = [];
      for (const d of snap.docs) {
        const data = d.data();
        let userInfo = null;
        try {
          const uDoc = await getDoc(doc(db, 'users_public', data.userId));
          if (uDoc.exists()) userInfo = uDoc.data();
        } catch (e) {}
        list.push({ id: d.id, ...data, userInfo });
      }
      setLikersList(list);
    };
    fetchLikers();
  }, [activeLikersPost]);

  const handleLike = async (postId: string, authorId: string) => {
    if (!user || isLiking) return;
    setIsLiking(true);
    const likeRef = doc(db, `posts/${postId}/likes`, user.uid);
    const isLiked = likedPosts.has(postId);
    
    try {
      if (isLiked) {
        // Optimistic UI updates
        setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
        
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'posts', postId), { likesCount: increment(-1) });
      } else {
        // Optimistic UI updates
        setLikedPosts(prev => { const n = new Set(prev); n.add(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p));
        
        await setDoc(likeRef, { 
          userId: user.uid, 
          userPhoto: profile?.photoURL || '',
          createdAt: serverTimestamp() 
        });
        await updateDoc(doc(db, 'posts', postId), { likesCount: increment(1) });
        
        if (authorId !== user.uid) {
           await addDoc(collection(db, 'notifications'), {
             userId: authorId,
             type: 'like',
             actorId: user.uid,
             postId,
             read: false,
             createdAt: serverTimestamp()
           });
        }
      }
    } catch (e) {
      // Revert optimistic update on error
      if (isLiked) {
        setLikedPosts(prev => { const n = new Set(prev); n.add(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p));
      } else {
        setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p));
      }
      handleFirestoreError(e, OperationType.WRITE, `posts/${postId}/likes`);
    } finally {
      setIsLiking(false);
    }
  };

  const observerTarget = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, masterPosts]);

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950">
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto items-center p-4 scrollbar-hide">
        {/* Top input bar */}
        <div 
          onClick={() => setIsComposerOpen(true)}
          className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 mb-6 flex gap-3 cursor-text group hover:border-[#00BFA5]/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden shrink-0">
             {profile?.photoURL ? <img src={profile.photoURL} alt="Me" className="w-full h-full object-cover" /> : null}
          </div>
          <div className="flex-1 bg-stone-100 dark:bg-stone-800/50 rounded-full px-4 flex items-center text-stone-500 group-hover:bg-stone-200 dark:group-hover:bg-stone-800 transition-colors">
            What's on your mind?
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {posts.map(post => (
            <PostItem 
              key={post.feedId} 
              post={post} 
              user={user} 
              profile={profile} 
              likedPosts={likedPosts} 
              handleLike={handleLike} 
              setShareModalPost={setShareModalPost} 
              handleDeletePost={handleDeletePost}
              handleCopyText={handleCopyText}
              handleRepost={handleRepost}
              onOpenProfile={(uid: string) => window.dispatchEvent(new CustomEvent('open-user-profile', { detail: uid }))}
              onOpenLikers={(postId: string) => setActiveLikersPost(postId)}
            />
          ))}
          
          {loading && (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}

          {loadingMore && <PostSkeleton />}
          
          <div ref={observerTarget} className="h-10 w-full" />
        </div>
      </div>

      {/* Post Composer Modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
                <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Create Post</h3>
                <button onClick={() => setIsComposerOpen(false)} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                  <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                </button>
             </div>
             <div className="p-4 flex-1">
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                   {profile?.photoURL ? <img src={profile.photoURL} alt="Me" className="w-full h-full object-cover" /> : null}
                 </div>
                 <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{profile?.username || 'You'}</h4>
               </div>

               <div className={`relative rounded-xl overflow-hidden ${postImages.length === 0 && selectedBg.id !== 'bg-none' ? selectedBg.class : 'bg-transparent text-stone-900 dark:text-stone-100'} ${postImages.length === 0 && selectedBg.id !== 'bg-none' ? 'min-h-[250px] flex items-center justify-center' : 'min-h-[150px]'}`}>
                 <textarea 
                   value={newPostText}
                   onChange={(e) => setNewPostText(e.target.value)}
                   placeholder={`What's on your mind?`}
                   className={`w-full bg-transparent border-none focus:ring-0 resize-none ${postImages.length === 0 && selectedBg.id !== 'bg-none' ? 'text-center text-2xl font-semibold placeholder:text-white/70' : 'text-stone-900 dark:text-stone-100 placeholder:text-stone-400'} p-4 h-full min-h-[150px]`}
                 />
               </div>

               {postImages.length > 0 && (
                  <div className="relative mt-4 grid grid-cols-2 gap-2">
                     {postImages.map((img, idx) => (
                       <div key={idx} className="relative rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800">
                         <img src={img} alt="Post preview" className="w-full h-32 object-cover" />
                         <button onClick={() => setPostImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-md backdrop-blur-sm transition-colors"><X className="w-4 h-4" /></button>
                       </div>
                     ))}
                  </div>
               )}

               {showBgSelector && postImages.length === 0 && (
                 <div className="mt-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                   <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                     {BACKGROUND_PRESETS.map((bg) => (
                       <button
                         key={bg.id}
                         onClick={() => setSelectedBg(bg)}
                         className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform hover:scale-110 ${selectedBg.id === bg.id ? 'border-primary shadow-sm' : 'border-transparent'} ${bg.class}`}
                         title={bg.name}
                       >
                         {bg.id === 'bg-none' && <X className="w-full h-full p-1 text-stone-500" />}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
             </div>
             
             <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center">
               <div className="flex gap-2">
                 <button 
                   onClick={() => setShowBgSelector(!showBgSelector)}
                   className={`p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${showBgSelector ? 'text-[#00BFA5]' : 'text-stone-500'}`}
                   disabled={postImages.length > 0}
                 >
                   <Palette className="w-6 h-6" />
                 </button>
                 <label className="p-2 text-stone-500 hover:text-[#00BFA5] hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors cursor-pointer">
                   <ImageIcon className="w-6 h-6" />
                   <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                 </label>
               </div>
               <button 
                 onClick={handlePostSubmit}
                 disabled={!newPostText.trim() && postImages.length === 0}
                 className="px-6 py-2 bg-[#00BFA5] hover:bg-[#009688] disabled:opacity-50 text-white rounded-full font-medium transition-colors"
               >
                 Post
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Likers Modal */}
      {activeLikersPost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Likes</h3>
              <button onClick={() => { setActiveLikersPost(null); setLikersList([]); }} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {likersList.length === 0 ? (
                <div className="p-8 text-center text-stone-500">No likes yet.</div>
              ) : (
                likersList.map((liker) => (
                  <div key={liker.id} className="flex items-center justify-between p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-xl transition-colors">
                    <div 
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-user-profile', { detail: liker.userId }));
                        setActiveLikersPost(null);
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden shrink-0">
                        {liker.userInfo?.photoURL || liker.userPhoto ? <img src={liker.userInfo?.photoURL || liker.userPhoto} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-stone-900 dark:text-stone-100 hover:underline">
                          {liker.userInfo?.username || 'Unknown User'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
                <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100">Share Post</h3>
                <button onClick={() => { setShareModalPost(null); setIsSharingToChat(false); }} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                  <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                </button>
             </div>
             <div className="p-4 flex flex-col gap-3">
                {!isSharingToChat ? (
                  <>
                    <button 
                      onClick={handleShareToStory}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-stone-900 dark:text-stone-100">Add to Story</div>
                        <div className="text-xs text-stone-500">Visible for 24 hours</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => setIsSharingToChat(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-stone-900 dark:text-stone-100">Send to Chat</div>
                        <div className="text-xs text-stone-500">Share with a friend</div>
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <button onClick={() => setIsSharingToChat(false)} className="text-sm text-[#00BFA5] mb-2 self-start">&larr; Back</button>
                    {shareChats.length === 0 ? (
                      <p className="text-center text-stone-500 py-4 text-sm">No chats found.</p>
                    ) : (
                      shareChats.map(chat => (
                        <button
                          key={chat.id}
                          onClick={() => handleShareToChat(chat)}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
                        >
                           <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                             {chat.photoURL ? <img src={chat.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[#00BFA5] text-white font-bold">{chat.name?.charAt(0) || '#'}</div>}
                           </div>
                           <div className="truncate font-medium text-stone-900 dark:text-stone-100">{chat.name || 'Chat'}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
      

    </div>
  );
};
