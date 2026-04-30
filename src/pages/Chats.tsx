import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, collectionGroup, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, writeBatch, limit } from 'firebase/firestore';
import { Search, Plus, Users, MessageSquare, MoreVertical, Image, FileText, Mic, Send, ArrowLeft, Check, CheckCheck, Bell } from 'lucide-react';
import { ChatView } from '../components/ChatView';
import { NewChatModal } from '../components/NewChatModal';
import { StoriesBar } from '../components/StoriesBar';

const ChatListItem = ({ chat, user, selectedChat, setSelectedChat }: { chat: any, user: any, selectedChat: any, setSelectedChat: any }) => {
  const isGroup = chat.type === 'group';
  const otherUserId = chat.participantIds.find((id: string) => id !== user?.uid);
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    if (isGroup || !otherUserId) return;
    const unsub = onSnapshot(doc(db, 'users_public', otherUserId), (docSnap) => {
      if (docSnap.exists()) {
        setOtherUser(docSnap.data());
      }
    }, (error) => console.error(error));
    return () => unsub();
  }, [otherUserId, isGroup]);

  const chatName = isGroup ? chat.name : (otherUser?.username || chat.participantNames?.[otherUserId] || 'Unknown User');
  const chatPhoto = isGroup ? chat.photoURL : (otherUser?.photoURL || chat.participantPhotos?.[otherUserId]);

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

  const isRequest = chat.type === 'private' && chat.lastMessage?.senderId !== user.uid && !chat.acceptedBy?.includes(user.uid) && chat.lastMessage;
  const unreadCount = chat.lastMessage?.senderId !== user.uid && chat.lastMessage && chat.lastMessage.unread ? 1 : 0;

  const typingUsers = chat?.typing ? Object.entries(chat.typing)
    .filter(([uid, isTyping]) => isTyping && uid !== user?.uid)
    .map(([uid]) => chat.participantNames?.[uid] || 'Someone') : [];

  return (
    <div 
      onClick={() => setSelectedChat(chat)}
      className={`p-4 border-b border-stone-100 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors flex items-center gap-3 ${selectedChat?.id === chat.id ? 'bg-stone-50 dark:bg-stone-900/50' : ''}`}
    >
      <div className="relative w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {chatPhoto ? (
          <img src={chatPhoto} alt={chatName} className="w-full h-full object-cover" />
        ) : (
          isGroup ? <Users className="w-6 h-6 text-stone-500 dark:text-stone-400" /> : <span className="text-lg font-medium text-stone-600 dark:text-stone-300">{chatName?.[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">{chatName}</h3>
          {!isGroup && otherUser && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ml-2 ${otherUser.online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'}`}>
              {otherUser.online ? 'Online' : (otherUser.lastSeen ? `Last seen ${formatLastSeen(otherUser.lastSeen)}` : 'Offline')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400'}`}>
            {typingUsers.length > 0 ? (
              <span className="text-[#00BFA5]">{isGroup ? `${typingUsers[0]} is typing...` : 'typing...'}</span>
            ) : isRequest ? (
              <span className="text-[#00BFA5] font-medium">New Request</span>
            ) : chat.lastMessage ? (
              <span className="flex items-center gap-1">
                {chat.lastMessage.senderId === user.uid && (
                  chat.lastMessage.status === 'seen' || chat.lastMessage.readBy?.length > 1 ? <CheckCheck className="w-3 h-3 text-[#34B7F1] dark:text-[#34B7F1]" /> : 
                  chat.lastMessage.status === 'delivered' ? <CheckCheck className="w-3 h-3 text-stone-400 dark:text-stone-500" /> : 
                  <Check className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                )}
                {chat.lastMessage.type === 'image' ? '📷 Image' : chat.lastMessage.type === 'document' ? '📄 Document' : chat.lastMessage.type === 'voice' ? '🎤 Audio' : chat.lastMessage.text}
              </span>
            ) : (
              'No messages yet'
            )}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 bg-[#00BFA5] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const Chats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'archived'>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;

    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifsData);
    }, (error) => console.error(error));

    return () => unsubscribeNotifs();
  }, [user]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const prevChatsRef = useRef<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  }, []);

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid)
    );

    const unsubscribeChats = onSnapshot(chatsQuery, async (chatsSnapshot) => {
      const chatsData = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Sort client-side to avoid hiding chats without updatedAt
      chatsData.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setChats(chatsData);

      let playSound = false;

      chatsData.forEach(async (chat) => {
        if (chat.lastMessage && chat.lastMessage.senderId !== user.uid) {
          const lastMessageTime = chat.lastMessage.createdAt?.toMillis?.() || 0;
          const prevTime = prevChatsRef.current[chat.id] || 0;

          if (lastMessageTime > prevTime && prevTime !== 0) {
            playSound = true;
          }
          prevChatsRef.current[chat.id] = lastMessageTime;

          // Mark messages as delivered
          try {
            const msgsQuery = query(
              collection(db, `chats/${chat.id}/messages`),
              orderBy('createdAt', 'desc'),
              limit(20)
            );
            const msgsSnap = await getDocs(msgsQuery);
            if (!msgsSnap.empty) {
              const batch = writeBatch(db);
              let hasUpdates = false;
              let shouldUpdateLastMessageDelivered = false;
              msgsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.senderId !== user.uid) {
                  if (data.status === 'sent') {
                    batch.update(docSnap.ref, { 
                      status: 'delivered',
                      deliveredAt: serverTimestamp()
                    });
                    hasUpdates = true;
                    if (chat.lastMessage && chat.lastMessage.createdAt && data.createdAt) {
                        try {
                            if (chat.lastMessage.createdAt.toMillis() === data.createdAt.toMillis()) {
                                shouldUpdateLastMessageDelivered = true;
                            }
                        } catch(e) {}
                    }
                  }
                }
              });
              if (shouldUpdateLastMessageDelivered) {
                 batch.update(doc(db, 'chats', chat.id), {
                    'lastMessage.status': 'delivered',
                    'lastMessage.deliveredAt': serverTimestamp()
                 });
                 hasUpdates = true;
              }
              if (hasUpdates) {
                await batch.commit();
              }
            }
          } catch (error) {
            console.error('Error marking messages as delivered:', error);
          }
        } else if (chat.lastMessage) {
           prevChatsRef.current[chat.id] = chat.lastMessage.createdAt?.toMillis?.() || 0;
        }
      });

      if (playSound && audioRef.current) {
        audioRef.current.play().catch(e => console.error('Error playing sound:', e));
      }
    }, (error) => console.error(error));

    return () => unsubscribeChats();
  }, [user]);

  const filteredChats = chats.filter(chat => {
    // Filter by tab
    const isArchived = chat.archivedBy?.includes(user?.uid);
    const isRequest = chat.type === 'private' && chat.lastMessage?.senderId !== user?.uid && !chat.acceptedBy?.includes(user?.uid) && chat.lastMessage;
    
    if (activeTab === 'archived' && !isArchived) return false;
    if (activeTab === 'requests' && !isRequest) return false;
    if (activeTab === 'all' && (isArchived || isRequest)) return false;

    if (!searchQuery) return true;
    const name = chat.type === 'private' 
      ? chat.participantNames?.[chat.participantIds.find((id: string) => id !== user?.uid)] || 'Unknown'
      : chat.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full bg-white dark:bg-stone-950 overflow-hidden">
      {/* Chat List Sidebar */}
      <div className={`w-full md:w-80 border-r border-stone-200 dark:border-stone-800 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Chats</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 rounded-xl transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-stone-950"></span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-stone-100 dark:border-stone-800">
                      <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-stone-500 dark:text-stone-400">
                          No notifications
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-3 border-b border-stone-100 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors ${!notif.read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                          >
                            <p className="text-sm text-stone-800 dark:text-stone-200">{notif.message}</p>
                            <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 block">
                              {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsNewChatModalOpen(true)}
                className="p-2 bg-[#00BFA5] text-white rounded-xl hover:bg-[#00A892] transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'all' ? 'bg-[#00BFA5] text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
            >
              All
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'requests' ? 'bg-[#00BFA5] text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
            >
              Requests
            </button>
            <button 
              onClick={() => setActiveTab('archived')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'archived' ? 'bg-[#00BFA5] text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
            >
              Archived
            </button>
          </div>
        </div>

        <StoriesBar />

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-stone-500 dark:text-stone-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No chats found</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                user={user} 
                selectedChat={selectedChat} 
                setSelectedChat={setSelectedChat} 
              />
            ))
          )}
        </div>
      </div>

      {/* Chat View Area */}
      <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <ChatView chat={selectedChat} onBack={() => setSelectedChat(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-950">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-stone-600 dark:text-stone-400">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {isNewChatModalOpen && (
        <NewChatModal onClose={() => setIsNewChatModalOpen(false)} onChatCreated={(chat) => {
          setSelectedChat(chat);
          setIsNewChatModalOpen(false);
        }} />
      )}
    </div>
  );
};
