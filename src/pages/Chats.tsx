import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, collectionGroup, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { Search, Plus, Users, MessageSquare, MoreVertical, Image, FileText, Mic, Send, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { ChatView } from '../components/ChatView';
import { NewChatModal } from '../components/NewChatModal';

export const Chats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'archived'>('all');

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeChats = onSnapshot(chatsQuery, (chatsSnapshot) => {
      const chatsData = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatsData);
    });

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
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 bg-[#00BFA5] text-white rounded-xl hover:bg-[#00A892] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
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

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-stone-500 dark:text-stone-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No chats found</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const isGroup = chat.type === 'group';
              const otherUserId = chat.participantIds.find((id: string) => id !== user?.uid);
              const chatName = isGroup ? chat.name : (chat.participantNames?.[otherUserId] || 'Unknown User');
              const chatPhoto = isGroup ? chat.photoURL : chat.participantPhotos?.[otherUserId];

              return (
                <div 
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-stone-100 dark:border-stone-800 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors flex items-center gap-3 ${selectedChat?.id === chat.id ? 'bg-stone-50 dark:bg-stone-900/50' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {chatPhoto ? (
                      <img src={chatPhoto} alt={chatName} className="w-full h-full object-cover" />
                    ) : (
                      isGroup ? <Users className="w-6 h-6 text-stone-500 dark:text-stone-400" /> : <span className="text-lg font-medium text-stone-600 dark:text-stone-300">{chatName?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">{chatName}</h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap ml-2">
                          {chat.lastMessage.createdAt ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 dark:text-stone-400 truncate">
                      {chat.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })
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
