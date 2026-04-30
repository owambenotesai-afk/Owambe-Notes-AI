import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { Search, X, UserPlus, Users, MessageSquare, Check, User } from 'lucide-react';

export const NewChatModal = ({ onClose, onChatCreated }: { onClose: () => void, onChatCreated: (chat: any) => void }) => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'private' | 'group'>('private');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !user) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const { or } = await import('firebase/firestore');
        const usersRef = collection(db, 'users');
        
        // Use "startsWith" search logic for Firestore
        const searchInput = searchQuery.toLowerCase();
        
        let q;
        if (searchQuery.length > 20) {
          // If it looks like a uid
          q = query(usersRef, where('uid', '==', searchQuery));
        } else {
          q = query(
            usersRef,
            where('username', '>=', searchInput),
            where('username', '<=', searchInput + '\uf8ff')
          );
        }
        
        const snapshot = await getDocs(q);
        const results = snapshot.docs
          .map(doc => ({ uid: doc.id, ...(doc.data() as any) }))
          .filter(u => u.uid !== user.uid); // Exclude self
          
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, user]);

  const handleStartPrivateChat = async (otherUser: any) => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      const sortedUids = [user.uid, otherUser.uid].sort();
      const chatId = `${sortedUids[0]}_${sortedUids[1]}`;

      // Check if private chat already exists
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        onChatCreated({ id: chatDoc.id, ...chatDoc.data()! });
        return;
      }

      await setDoc(doc(db, 'chats', chatId), {
        type: 'private',
        participantIds: [user.uid, otherUser.uid],
        participantNames: {
          [user.uid]: profile.username || 'User',
          [otherUser.uid]: otherUser.username
        },
        participantPhotos: {
          [user.uid]: profile.photoURL || null,
          [otherUser.uid]: otherUser.photoURL || null
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add members to subcollection
      await setDoc(doc(db, `chats/${chatId}/members`, user.uid), {
        userId: user.uid,
        chatId: chatId,
        role: 'admin',
        joinedAt: serverTimestamp()
      });
      
      await setDoc(doc(db, `chats/${chatId}/members`, otherUser.uid), {
        userId: otherUser.uid,
        chatId: chatId,
        role: 'member',
        joinedAt: serverTimestamp()
      });

      onChatCreated({ id: chatId, type: 'private', participantIds: [user.uid, otherUser.uid] });
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !profile || !groupName.trim() || selectedUsers.length === 0) return;
    setLoading(true);

    try {
      const participantIds = [user.uid, ...selectedUsers.map(u => u.uid)];
      const participantNames = { [user.uid]: profile.username || 'User' };
      selectedUsers.forEach(u => participantNames[u.uid] = u.username);

      const newChatRef = await addDoc(collection(db, 'chats'), {
        type: 'group',
        name: groupName.trim(),
        participantIds, // Store up to 100 for easy querying, real members in subcollection
        participantNames,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: {
          onlyAdminsCanMessage: false,
          onlyAdminsCanAddMembers: false
        }
      });

      // Add members to subcollection
      await setDoc(doc(db, `chats/${newChatRef.id}/members`, user.uid), {
        userId: user.uid,
        chatId: newChatRef.id,
        role: 'admin',
        joinedAt: serverTimestamp()
      });
      
      for (const u of selectedUsers) {
        await setDoc(doc(db, `chats/${newChatRef.id}/members`, u.uid), {
          userId: u.uid,
          chatId: newChatRef.id,
          role: 'member',
          joinedAt: serverTimestamp()
        });
      }

      onChatCreated({ id: newChatRef.id, type: 'group', name: groupName.trim(), participantIds });
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.find(u => u.uid === user.uid)) {
      setSelectedUsers(selectedUsers.filter(u => u.uid !== user.uid));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-950 rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">New Chat</h2>
          <button onClick={onClose} className="p-2 text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setMode('private')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'private' ? 'text-stone-900 dark:text-stone-100 border-b-2 border-[#00BFA5]' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'}`}
          >
            Private Chat
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${mode === 'group' ? 'text-stone-900 dark:text-stone-100 border-b-2 border-[#00BFA5]' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'}`}
          >
            New Group
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {mode === 'group' && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
              />
            </div>
          )}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Search users by username or User ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-900 border-none rounded-xl py-3 pl-9 pr-4 text-sm focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
            />
          </div>

          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedUsers.map(u => (
                <div key={u.uid} className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 px-3 py-1.5 rounded-full text-xs font-medium text-stone-700 dark:text-stone-300">
                  {u.username}
                  <button onClick={() => toggleUserSelection(u)} className="text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4 text-stone-500 dark:text-stone-400 text-sm">Searching...</div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="text-center py-4 text-stone-500 dark:text-stone-400 text-sm">No users found</div>
            ) : (
              searchResults.map(u => (
                <div 
                  key={u.uid} 
                  onClick={() => mode === 'private' ? handleStartPrivateChat(u) : toggleUserSelection(u)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900 cursor-pointer transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-stone-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900 dark:text-stone-100">@{u.username}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">ID: {u.userId}</p>
                    </div>
                  </div>
                  {mode === 'group' && (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedUsers.find(su => su.uid === u.uid) ? 'bg-[#00BFA5] border-[#00BFA5] text-white' : 'border-stone-300 dark:border-stone-700'}`}>
                      {selectedUsers.find(su => su.uid === u.uid) && <Check className="w-3 h-3" />}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {mode === 'group' && (
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0 || loading}
              className="w-full py-3 bg-[#00BFA5] text-white rounded-xl font-medium hover:bg-[#00A892] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Group ({selectedUsers.length} members)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
