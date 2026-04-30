import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDoc, writeBatch, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Send, ArrowLeft, MoreVertical, Check, CheckCheck, FileText, X, Smile, Paperclip, Image as ImageIcon, Mic, Phone, Video } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';

export const ChatView = ({ chat, onBack }: { chat: any, onBack: () => void }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    if (!chat || !user) return;

    const isGroup = chat.type === 'group';
    const otherUserId = chat.participantIds.find((id: string) => id !== user.uid);

    if (!isGroup && otherUserId) {
      const unsubOtherUser = onSnapshot(doc(db, 'users_public', otherUserId), (docSnap) => {
        if (docSnap.exists()) {
          setOtherUser(docSnap.data());
        }
      });
      return () => unsubOtherUser();
    }
  }, [chat, user]);

  useEffect(() => {
    if (!chat || !user) return;

    const q = query(
      collection(db, `chats/${chat.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    let isSubscribed = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isSubscribed) return;
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      const unseenIds = snapshot.docs
        .filter(docSnap => {
          const data = docSnap.data();
          return data.senderId !== user.uid && data.status !== 'seen';
        })
        .map(docSnap => docSnap.id);

      if (unseenIds.length > 0) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          if (unseenIds.includes(docSnap.id)) {
            batch.update(docSnap.ref, {
              status: 'seen',
              seenAt: serverTimestamp()
            });
          }
        });
        
        const lastMsgData = msgs[msgs.length - 1];
        if (unseenIds.includes(lastMsgData.id)) {
          batch.update(doc(db, 'chats', chat.id), {
            'lastMessage.status': 'seen',
            'lastMessage.seenAt': serverTimestamp(),
            'lastMessage.unread': false
          });
        }
        batch.commit().catch(e => console.error("Error setting messages as seen", e));
      }
    }, async (error) => {
      console.error('Error in messages onSnapshot:', error);
      if (!isSubscribed) return;
      // Fallback to getDocs
      try {
        const snapshot = await getDocs(q);
        if (!isSubscribed) return;
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      } catch (err) {
        console.error('Error in messages getDocs fallback:', err);
      }
    });

    // Fetch user role
    const fetchRole = async () => {
      try {
        const memberRef = doc(db, `chats/${chat.id}/members`, user.uid);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists() && isSubscribed) {
          setUserRole(memberSnap.data().role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };
    fetchRole();

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [chat, user]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);




  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    if (!chat || !user) return;

    updateDoc(doc(db, 'chats', chat.id), {
      [`typing.${user.uid}`]: true
    }).catch(console.error);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'chats', chat.id), {
        [`typing.${user.uid}`]: false
      }).catch(console.error);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chat) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    
    let messageType = 'text';

    try {
      const messageData: any = {
        senderId: user.uid,
        text: messageText,
        type: messageType,
        createdAt: serverTimestamp(),
        status: 'sent',
        deliveredAt: null,
        seenAt: null
      };

      await addDoc(collection(db, `chats/${chat.id}/messages`), messageData);

      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: {
          text: messageText,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          unread: true
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const [activeReactionMessage, setActiveReactionMessage] = useState<string | null>(null);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user || !chat) return;
    try {
      const messageRef = doc(db, `chats/${chat.id}/messages`, messageId);
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const currentReactions = message.reactions || {};
      const userReaction = currentReactions[user.uid];

      if (userReaction === emoji) {
        // Remove reaction
        const newReactions = { ...currentReactions };
        delete newReactions[user.uid];
        await updateDoc(messageRef, { reactions: newReactions });
      } else {
        // Add/Update reaction
        await updateDoc(messageRef, {
          [`reactions.${user.uid}`]: emoji
        });
      }
      setActiveReactionMessage(null);
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file || !user || !chat) return;

    setShowAttachMenu(false);
    setUploadingMedia(true);

    try {
      const storageRef = ref(storage, `chat_media/${chat.id}/${user.uid}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const messageData: any = {
        senderId: user.uid,
        type: type,
        mediaUrl: url,
        fileName: file.name,
        fileSize: file.size,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
        status: 'sent',
        deliveredAt: null,
        seenAt: null
      };

      await addDoc(collection(db, `chats/${chat.id}/messages`), messageData);

      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: {
          text: type === 'image' ? '📷 Image' : type === 'document' ? '📄 Document' : '🎤 Audio',
          senderId: user.uid,
          createdAt: serverTimestamp(),
          unread: true
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  if (!chat || !user) return null;

  const isGroup = chat.type === 'group';
  const otherUserId = chat.participantIds.find((id: string) => id !== user.uid);
  const chatName = isGroup ? chat.name : (otherUser?.username || chat.participantNames?.[otherUserId] || 'Unknown User');
  const chatPhoto = isGroup ? chat.photoURL : (otherUser?.photoURL || chat.participantPhotos?.[otherUserId]);

  const typingUsers = chat?.typing ? Object.entries(chat.typing)
    .filter(([uid, isTyping]) => isTyping && uid !== user?.uid)
    .map(([uid]) => chat.participantNames?.[uid] || 'Someone') : [];

  // Typing sound effect
  const typingAudioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Only instantiate Audio once to avoid memory leaks
    if (!typingAudioRef.current) {
      const audio = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//+7kAAAAAAAAAAAAAAAAAAAAAAABMYXZjNTguMTM0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASAAAADg5yP0AAAAAAAAAAAAAAAAAAAA//MUxAAAAANIgAAAAAAA0gAAAAATEFNRTMuMTAwA8IAAAAAAAAAAIAgAECQgQAAoAAASAAA4Ocj9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxBQAABMIgAAAAAAA0gAAAAATEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxEQAABMIgAAAAAAA0gAAAAATEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxHAAABMIgAAAAAAA0gAAAAATEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==");
      audio.preload = "auto";
      audio.loop = true;
      typingAudioRef.current = audio;
    }

    // Try unlocking audio context on first user interaction if needed
    const unlockAudio = () => {
      // Just resolving the interaction requirement
      if (typingAudioRef.current) {
        typingAudioRef.current.play().then(() => {
          typingAudioRef.current?.pause();
          typingAudioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (typingUsers.length > 0) {
      if (typingAudioRef.current) {
        typingAudioRef.current.play().catch(e => console.error("Typing audio play error:", e));
      }
    } else {
      if (typingAudioRef.current) {
        typingAudioRef.current.pause();
        typingAudioRef.current.currentTime = 0;
      }
    }
  }, [typingUsers.length]);

  // Message status update effect
  useEffect(() => {
    if (!messages || messages.length === 0 || !user || !chat) return;

    let shouldUpdateLastMsgSeen = false;
    let shouldUpdateLastMsgDelivered = false;

    messages.forEach(msg => {
      // If we received this message, mark it as seen
      if (msg.senderId !== user.uid && msg.status !== 'seen') {
        const msgRef = doc(db, `chats/${chat.id}/messages`, msg.id);
        updateDoc(msgRef, {
          status: 'seen',
          seenAt: serverTimestamp()
        }).catch(e => console.error(e));
        
        if (chat.lastMessage && chat.lastMessage.senderId !== user.uid && chat.lastMessage.status !== 'seen') {
            if (chat.lastMessage.createdAt?.toMillis?.() === msg.createdAt?.toMillis?.() || chat.lastMessage.text === msg.text) {
                shouldUpdateLastMsgSeen = true;
            }
        }
      }
      
      // If we sent this message, check if recipient is online to mark as delivered
      if (!isGroup && otherUser && msg.senderId === user.uid && msg.status === 'sent') {
        if (otherUser.online) {
          const msgRef = doc(db, `chats/${chat.id}/messages`, msg.id);
          updateDoc(msgRef, {
            status: 'delivered',
            deliveredAt: serverTimestamp()
          }).catch(e => console.error(e));
          
          if (chat.lastMessage && chat.lastMessage.senderId === user.uid && chat.lastMessage.status === 'sent') {
              if (chat.lastMessage.createdAt?.toMillis?.() === msg.createdAt?.toMillis?.() || chat.lastMessage.text === msg.text) {
                  shouldUpdateLastMsgDelivered = true;
              }
          }
        }
      }
    });

    if (shouldUpdateLastMsgSeen) {
        updateDoc(doc(db, 'chats', chat.id), {
            'lastMessage.status': 'seen',
            'lastMessage.seenAt': serverTimestamp(),
            'lastMessage.unread': false
        }).catch(e => console.error(e));
    } else if (chat.lastMessage && chat.lastMessage.senderId !== user.uid && chat.lastMessage.unread) {
        updateDoc(doc(db, 'chats', chat.id), {
            'lastMessage.unread': false
        }).catch(e => console.error(e));
    }
    if (shouldUpdateLastMsgDelivered) {
        updateDoc(doc(db, 'chats', chat.id), {
            'lastMessage.status': 'delivered',
            'lastMessage.deliveredAt': serverTimestamp()
        }).catch(e => console.error(e));
    }
  }, [messages, otherUser?.online, user?.uid, chat?.id, isGroup]);

  const isRequest = chat?.type === 'private' && chat.lastMessage?.senderId !== user?.uid && !chat.acceptedBy?.includes(user?.uid) && chat.lastMessage;

  const formatLastSeen = (lastSeenStr: string) => {
    if (!lastSeenStr) return '';
    const lastSeen = new Date(lastSeenStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  };

  const handleAcceptRequest = async () => {
    if (!user || !chat) return;
    try {
      const acceptedBy = chat.acceptedBy || [];
      if (!acceptedBy.includes(user.uid)) {
        await updateDoc(doc(db, 'chats', chat.id), {
          acceptedBy: [...acceptedBy, user.uid]
        });
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState<string | null>(null);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const isArchived = chat.archivedBy?.includes(user?.uid);

  const toggleArchive = async () => {
    if (!user || !chat) return;
    try {
      const archivedBy = chat.archivedBy || [];
      const newArchivedBy = isArchived 
        ? archivedBy.filter((id: string) => id !== user.uid)
        : [...archivedBy, user.uid];
        
      await updateDoc(doc(db, 'chats', chat.id), {
        archivedBy: newArchivedBy
      });
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername.trim() || !user || !chat || userRole !== 'admin') return;
    
    setAddingMember(true);
    try {
      const usersRef = collection(db, 'users_public');
      const q = query(usersRef, where('username', '==', newMemberUsername.trim().toLowerCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert('User not found.');
        setAddingMember(false);
        return;
      }
      
      const newMember = snapshot.docs[0].data();
      const newMemberId = snapshot.docs[0].id;
      
      if (chat.participantIds.includes(newMemberId)) {
        alert('User is already in the group.');
        setAddingMember(false);
        return;
      }
      
      const batch = writeBatch(db);
      
      // Update chat document
      const chatRef = doc(db, 'chats', chat.id);
      batch.update(chatRef, {
        participantIds: [...chat.participantIds, newMemberId],
        [`participantNames.${newMemberId}`]: newMember.username,
        [`participantPhotos.${newMemberId}`]: newMember.photoURL || null
      });
      
      // Add to members subcollection
      const memberRef = doc(db, `chats/${chat.id}/members`, newMemberId);
      batch.set(memberRef, {
        userId: newMemberId,
        chatId: chat.id,
        role: 'member',
        joinedAt: serverTimestamp()
      });
      
      await batch.commit();
      setNewMemberUsername('');
      alert('Member added successfully!');
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !chat || userRole !== 'admin' || memberId === user.uid) return;
    
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const batch = writeBatch(db);
      
      // Update chat document
      const chatRef = doc(db, 'chats', chat.id);
      const newParticipantIds = chat.participantIds.filter((id: string) => id !== memberId);
      
      const newParticipantNames = { ...chat.participantNames };
      delete newParticipantNames[memberId];
      
      const newParticipantPhotos = { ...chat.participantPhotos };
      delete newParticipantPhotos[memberId];
      
      batch.update(chatRef, {
        participantIds: newParticipantIds,
        participantNames: newParticipantNames,
        participantPhotos: newParticipantPhotos
      });
      
      // Remove from members subcollection
      const memberRef = doc(db, `chats/${chat.id}/members`, memberId);
      batch.delete(memberRef);
      
      await batch.commit();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member.');
    }
  };

  const initiateCall = async (isVideo: boolean = false) => {
    if (!user || !chat || isGroup) return;
    try {
      const otherUserId = chat.participantIds.find((id: string) => id !== user.uid);
      const callDocRef = await addDoc(collection(db, 'calls'), {
        callerId: user.uid,
        callerName: profile?.username || 'Someone',
        callerPhoto: profile?.photoURL || '',
        receiverId: otherUserId,
        chatId: chat.id,
        status: 'ringing',
        isVideo,
        createdAt: serverTimestamp()
      });
      
      const event = new CustomEvent('start-call', { 
        detail: { 
          callId: callDocRef.id,
          receiverName: chatName,
          receiverPhoto: chatPhoto,
          isVideo
        } 
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-stone-950 relative">
      <div className={`flex flex-col h-full w-full ${showGroupInfo ? 'hidden md:flex md:w-2/3' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 sticky top-0 z-10">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => {
              if (isGroup) {
                setShowGroupInfo(true);
              } else {
                const otherUserId = chat.participantIds.find((id: string) => id !== user.uid);
                if (otherUserId) setShowProfileModal(otherUserId);
              }
            }}
          >
            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden p-2 -ml-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
              {chatPhoto ? (
                <img src={chatPhoto} alt={chatName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-medium text-stone-600 dark:text-stone-300">{chatName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-stone-900 dark:text-stone-100 hover:underline">{chatName}</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {typingUsers.length > 0 
                  ? <span className="text-[#00BFA5]">{`${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`}</span>
                  : isGroup 
                    ? `${chat.participantIds.length} members` 
                    : otherUser?.online 
                      ? <span className="text-[#00BFA5]">Online</span> 
                      : otherUser?.lastSeen 
                        ? `Last seen ${formatLastSeen(otherUser.lastSeen)}` 
                        : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isGroup && (
              <>
                <button 
                  onClick={() => initiateCall(true)}
                  className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl transition-colors"
                  title="Video Call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => initiateCall(false)}
                  className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl transition-colors"
                  title="Voice Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </>
            )}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg py-1 z-20">
                  {isGroup && (
                    <button 
                      onClick={() => { setShowGroupInfo(true); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                      Group Info
                    </button>
                  )}
                  <button 
                    onClick={toggleArchive}
                    className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    {isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mobile-scrollbar-hide p-4 space-y-4 bg-stone-50 dark:bg-stone-950">
        {messages.map((msg, index) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <div className="bg-stone-100 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 text-xs px-3 py-1 rounded-full text-center max-w-[80%]">
                  {msg.text}
                </div>
              </div>
            );
          }

          const isMine = msg.senderId === user.uid;
          const showAvatar = isGroup && !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId || messages[index - 1].type === 'system');
          
          return (
            <div key={msg.id} className={`flex gap-2 group ${isMine ? 'flex-row-reverse' : ''}`}>
              {isGroup && !isMine && (
                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex-shrink-0 overflow-hidden flex items-center justify-center mt-auto">
                  {showAvatar && (
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                      {chat.participantNames?.[msg.senderId]?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              )}
              <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {showAvatar && (
                  <span className="text-xs text-stone-500 dark:text-stone-400 mb-1 ml-1">
                    {chat.participantNames?.[msg.senderId] || 'User'}
                  </span>
                )}
                <div className={`px-4 py-2 rounded-2xl ${isMine ? 'bg-[#00BFA5] text-white rounded-br-sm' : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 rounded-bl-sm shadow-sm'}`}>
                  {msg.type === 'image' && msg.mediaUrl && (
                    <img src={msg.mediaUrl} alt="Attached image" className="max-w-xs rounded-xl mb-2 object-cover" />
                  )}
                  {msg.type === 'document' && msg.mediaUrl && (
                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-stone-100 dark:bg-stone-800 rounded-xl mb-2 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                      <FileText className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                      <span className="text-sm font-medium underline">View Document</span>
                    </a>
                  )}
                  {msg.type === 'voice' && msg.mediaUrl && (
                    <audio controls src={msg.mediaUrl} className="w-full max-w-xs mb-2" />
                  )}
                  {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/70' : 'text-stone-400 dark:text-stone-500'}`}>
                    <span className="text-[10px]">
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {isMine && (
                      msg.status === 'seen' || msg.readBy?.length > 1 ? <CheckCheck className="w-4 h-4 text-white dark:text-white" /> : 
                      msg.status === 'delivered' || msg.deliveredTo?.length > 1 ? <CheckCheck className="w-4 h-4 text-stone-200 dark:text-stone-400" /> : 
                      <Check className="w-4 h-4 text-stone-200 dark:text-stone-400" />
                    )}
                  </div>
                </div>
                
                {/* Reactions Display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(
                      Object.entries(msg.reactions).reduce((acc: any, [uid, emoji]) => {
                        acc[emoji as string] = (acc[emoji as string] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]: [string, any]) => (
                      <div key={emoji} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full px-2 py-0.5 text-xs shadow-sm flex items-center gap-1 text-stone-900 dark:text-stone-100">
                        <span>{emoji}</span>
                        {count > 1 && <span className="text-stone-500 dark:text-stone-400 font-medium">{count}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction Button */}
              <div className={`relative flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'mr-2' : 'ml-2'}`}>
                <button 
                  onClick={() => setActiveReactionMessage(activeReactionMessage === msg.id ? null : msg.id)}
                  className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                >
                  <Smile className="w-4 h-4" />
                </button>
                
                {activeReactionMessage === msg.id && (
                  <div className={`absolute top-full mt-1 ${isMine ? 'right-0' : 'left-0'} bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg rounded-full px-2 py-1 flex gap-1 z-20`}>
                    {reactionEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full text-lg transition-transform hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area or Accept Request */}
      {isRequest ? (
        <div className="p-4 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center">
            {chatName} wants to chat with you. Accept to reply.
          </p>
          <button 
            onClick={handleAcceptRequest}
            className="px-6 py-2 bg-[#00BFA5] text-white rounded-full font-medium hover:bg-[#00A892] transition-colors"
          >
            Accept Request
          </button>
        </div>
      ) : chat.settings?.onlyAdminsCanMessage && userRole === 'member' ? (
        <div className="p-4 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex items-center justify-center">
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center">
            Only admins can send messages in this group.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-full transition-colors"
              disabled={uploadingMedia}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg py-2 flex flex-col gap-1 z-20 min-w-[150px]">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-left"
                >
                  <ImageIcon className="w-4 h-4" /> Image
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-left"
                >
                  <FileText className="w-4 h-4" /> Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('Audio recording coming soon!');
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-left"
                >
                  <Mic className="w-4 h-4" /> Audio
                </button>
              </div>
            )}
          </div>

          <input 
            type="file" 
            ref={imageInputRef} 
            onChange={(e) => handleFileUpload(e, 'image')} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileUpload(e, 'document')} 
            accept=".pdf,.doc,.docx,.txt,.csv" 
            className="hidden" 
          />

          <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder={uploadingMedia ? "Uploading..." : "Type a message..."}
                disabled={uploadingMedia}
                className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-full py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 disabled:opacity-50"
              />
            {newMessage.trim() && !uploadingMedia && (
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[#00BFA5] text-white rounded-full hover:bg-[#00A892] transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
      )}
      </div>

      {/* Group Info Sidebar */}
      {showGroupInfo && isGroup && (
        <div className="w-full md:w-1/3 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 flex flex-col h-full absolute md:relative z-20 right-0">
          <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">Group Info</h3>
            <button onClick={() => setShowGroupInfo(false)} className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 flex flex-col items-center border-b border-stone-200 dark:border-stone-800">
              <div className="w-24 h-24 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center mb-4 overflow-hidden">
                {chatPhoto ? (
                  <img src={chatPhoto} alt={chatName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-medium text-stone-600 dark:text-stone-300">{chatName?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">{chatName}</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">{chat.participantIds.length} members</p>
              {chat.description && (
                <p className="text-sm text-stone-600 dark:text-stone-300 text-center px-4">{chat.description}</p>
              )}
            </div>
            
            <div className="p-4">
              <div className="mb-6">
                <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">Members</h4>
                <div className="space-y-3">
                  {chat.participantIds.map((id: string) => (
                    <div key={id} className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setShowProfileModal(id)}
                      >
                        <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                          {chat.participantPhotos?.[id] ? (
                            <img src={chat.participantPhotos[id]} alt={chat.participantNames?.[id]} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{chat.participantNames?.[id]?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 hover:underline">
                            {id === user?.uid ? 'You' : chat.participantNames?.[id] || 'Unknown User'}
                          </p>
                        </div>
                      </div>
                      {userRole === 'admin' && id !== user?.uid && (
                        <button 
                          onClick={() => handleRemoveMember(id)}
                          className="text-xs text-red-500 hover:text-red-600 p-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {userRole === 'admin' && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">Edit Group</h4>
                  <div className="space-y-3 mb-6">
                    <input
                      type="text"
                      value={chatName}
                      onChange={async (e) => {
                        await updateDoc(doc(db, 'chats', chat.id), { name: e.target.value });
                      }}
                      placeholder="Group Name"
                      className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100"
                    />
                    <textarea
                      value={chat.description || ''}
                      onChange={async (e) => {
                        await updateDoc(doc(db, 'chats', chat.id), { description: e.target.value });
                      }}
                      placeholder="Group Description"
                      className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 resize-none h-20"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors rounded-xl py-2 px-3 text-sm text-center text-stone-700 dark:text-stone-300 font-medium">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const storageRef = ref(storage, `group_photos/${chat.id}_${Date.now()}`);
                              await uploadBytes(storageRef, file);
                              const url = await getDownloadURL(storageRef);
                              await updateDoc(doc(db, 'chats', chat.id), { photoURL: url });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">Add Member</h4>
                  <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={newMemberUsername}
                      onChange={(e) => setNewMemberUsername(e.target.value)}
                      placeholder="Username"
                      className="flex-1 bg-stone-100 dark:bg-stone-900 border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100"
                    />
                    <button
                      type="submit"
                      disabled={addingMember || !newMemberUsername.trim()}
                      className="px-4 py-2 bg-[#00BFA5] text-white rounded-xl text-sm font-medium hover:bg-[#00A892] disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </form>

                  <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 dark:text-stone-300">Only admins can send messages</span>
                      <button 
                        onClick={async () => {
                          await updateDoc(doc(db, 'chats', chat.id), {
                            'settings.onlyAdminsCanMessage': !chat.settings?.onlyAdminsCanMessage
                          });
                        }}
                        className={`w-10 h-6 rounded-full transition-colors relative ${chat.settings?.onlyAdminsCanMessage ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${chat.settings?.onlyAdminsCanMessage ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <UserProfileModal 
          userId={showProfileModal} 
          onClose={() => setShowProfileModal(null)} 
        />
      )}
    </div>
  );
};
