import React, { useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { AIAssistantPopup } from './AIAssistantPopup';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Globe, 
  MessageSquare, 
  FileText, 
  Wallet,
  Phone,
  PenSquare,
  Bell,
  Search,
  Plus,
  Home,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { CallModal } from './CallModal';
import { UserProfileModal } from './UserProfileModal';

const NotificationsBadge = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });
    return () => unsubscribe();
  }, [user]);

  if (unreadCount === 0) return null;

  return (
    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
    </span>
  );
};

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Create Menu state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Bottom scroll nav state
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isTopNavVisible, setIsTopNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Ignore bounce effect at the top
    if (currentScrollY <= 0) {
      setIsBottomNavVisible(true);
      setIsTopNavVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    if (currentScrollY > lastScrollY.current + 10) {
      // scroll DOWN (moving down the page)
      setIsBottomNavVisible(false);
      setIsTopNavVisible(false);
      lastScrollY.current = currentScrollY;
    } else if (currentScrollY < lastScrollY.current - 10) {
      // scroll UP (moving up the page)
      setIsBottomNavVisible(true);
      setIsTopNavVisible(true);
      lastScrollY.current = currentScrollY;
    }
  };

  useEffect(() => {
    if (!user) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        setIncomingCall({ id: callDoc.id, ...callDoc.data() });
      } else {
        setIncomingCall(null);
      }
    }, (error) => {
      console.error('calls onSnapshot error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'accepted' });
      setActiveCallId(incomingCall.id);
      setIsCaller(false);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  // Listen for custom event to start a call
  const [outgoingCallInfo, setOutgoingCallInfo] = useState<{name?: string, photo?: string, isVideo?: boolean} | null>(null);

  useEffect(() => {
    const handleStartCall = (e: CustomEvent) => {
      setActiveCallId(e.detail.callId);
      setIsCaller(true);
      setOutgoingCallInfo({
        name: e.detail.receiverName,
        photo: e.detail.receiverPhoto,
        isVideo: e.detail.isVideo
      });
    };
    const handleOpenProfile = (e: CustomEvent) => {
      setSelectedUserId(e.detail);
    };

    window.addEventListener('start-call' as any, handleStartCall);
    window.addEventListener('open-user-profile' as any, handleOpenProfile);
    return () => {
      window.removeEventListener('start-call' as any, handleStartCall);
      window.removeEventListener('open-user-profile' as any, handleOpenProfile);
    };
  }, []);

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const qStr = searchQuery.toLowerCase();
      getDocs(collection(db, 'users_public')).then(snapshot => {
        const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const matched = allUsers.filter(u => 
          (u.username && u.username.toLowerCase().includes(qStr)) ||
          u.id.toLowerCase() === qStr
        ).slice(0, 5);
        setSearchResults(matched);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-[100dvh] bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden relative">
      
      {/* Incoming Call Overlay */}
      {incomingCall && !activeCallId && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-stone-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center overflow-hidden">
            {incomingCall.callerPhoto ? (
              <img src={incomingCall.callerPhoto} alt={incomingCall.callerName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-stone-400" />
            )}
          </div>
          <div>
            <h4 className="font-bold">{incomingCall.callerName || 'Someone'}</h4>
            <p className="text-sm text-stone-400">Incoming {incomingCall.isVideo ? 'video' : 'voice'} call...</p>
          </div>
          <div className="flex gap-2 ml-4">
            <button onClick={rejectCall} className="p-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors">
              <Phone className="w-5 h-5 rotate-[135deg]" />
            </button>
            <button onClick={acceptCall} className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors animate-pulse">
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Call Modal */}
      {activeCallId && (
        <CallModal 
          callId={activeCallId} 
          isCaller={isCaller} 
          isVideo={isCaller ? outgoingCallInfo?.isVideo : incomingCall?.isVideo}
          receiverName={isCaller ? outgoingCallInfo?.name : incomingCall?.callerName} 
          receiverPhoto={isCaller ? outgoingCallInfo?.photo : incomingCall?.callerPhoto}
          onClose={() => {
            setActiveCallId(null);
            setOutgoingCallInfo(null);
          }} 
        />
      )}

      {/* Top Header */}
      <header className={`fixed top-0 left-0 w-full h-16 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-between px-4 z-50 gap-4 transition-transform duration-300 ${isTopNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        
        {/* Left section: Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {location.pathname === '/posts' ? (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-xl text-stone-900 dark:text-stone-100 leading-tight">Feed</span>
              <span className="font-medium text-[11px] text-stone-500 leading-none">OwambeNotes AI</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 bg-[#00BFA5] text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
                O
              </div>
              <span className="font-semibold tracking-tight text-stone-900 dark:text-stone-100 text-[16px] hidden sm:block">OwambeNotes AI</span>
            </>
          )}
        </div>

        {/* Center section: Search Bar */}
        <div className="flex-1 max-w-md relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-stone-400" />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
              className="w-full bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 pl-9 pr-4 py-2 rounded-full border-none focus:ring-2 focus:ring-[#00BFA5]/50 focus:bg-white dark:focus:bg-stone-900 transition-all placeholder:text-stone-500 text-[16px]"
            />
          </div>
          
          {/* Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden z-[100]">
              {searchResults.length > 0 ? (
                <div className="py-2 max-h-[300px] overflow-y-auto">
                  {searchResults.map(u => (
                    <div 
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden shrink-0">
                        {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-full h-full p-1.5 text-stone-400" />}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{u.username || 'User'}</span>
                        <span className="text-[10px] text-stone-500 truncate">@{u.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-stone-500">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Create Button (like Facebook) */}
          <div className="relative">
            <button 
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              onBlur={() => setTimeout(() => setIsCreateOpen(false), 200)}
              className="w-10 h-10 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {/* Create Dropdown */}
            {isCreateOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-[100] animate-in slide-in-from-top-2">
                <button 
                  onClick={() => { 
                    if (location.pathname !== '/posts') {
                      navigate('/posts');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('open-composer')), 100);
                    } else {
                      window.dispatchEvent(new CustomEvent('open-composer')); 
                    }
                    setIsCreateOpen(false); 
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <PenSquare className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100">Create Post</span>
                    <span className="text-[10px] text-stone-500">Share your thoughts</span>
                  </div>
                </button>
                <button 
                  onClick={() => { 
                    if (location.pathname !== '/chats') {
                      navigate('/chats');
                      setTimeout(() => window.dispatchEvent(new CustomEvent('open-story-creator')), 100);
                    } else {
                      window.dispatchEvent(new CustomEvent('open-story-creator')); 
                    }
                    setIsCreateOpen(false); 
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100">Create Story</span>
                    <span className="text-[10px] text-stone-500">Share a photo or text</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <NavLink 
            to="/notifications" 
            className={({ isActive }) => `relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[#00BFA5]/10 text-[#00BFA5]' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'} shadow-sm`}
          >
            <Bell className="w-5 h-5" />
            <NotificationsBadge />
          </NavLink>
        </div>
      </header>

      {selectedUserId && (
        <UserProfileModal 
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
      
      {/* Main Content */}
      <main 
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto scrollbar-hide pt-16 ${location.pathname.startsWith('/wallet') ? '' : 'pb-20'}`}
      >
        <Outlet />
      </main>
      
      {/* Bottom Mobile Navigation Bar */}
      {!location.pathname.startsWith('/wallet') && (
      <nav id="global-nav" className={`fixed bottom-0 left-0 w-full h-20 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-around px-2 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-transform duration-300 ${isBottomNavVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        
        {/* 1. Home */}
        <NavLink 
          to="/posts" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        {/* 2. Explore */}
        <NavLink 
          to="/tools" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${(isActive || location.pathname.startsWith('/tools') || location.pathname.startsWith('/notes')) ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <Globe className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Explore</span>
        </NavLink>

        {/* 3. Chats */}
        <NavLink 
          to="/chats" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${(isActive || location.pathname.startsWith('/chats')) ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <MessageSquare className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Chat</span>
        </NavLink>

        {/* 4. Wallet */}
        <NavLink 
          to="/wallet" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${(isActive || location.pathname.startsWith('/wallet')) ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <Wallet className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Wallet</span>
        </NavLink>

        {/* 5. Profile */}
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <User className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Profile</span>
        </NavLink>

      </nav>
      )}
      
      {/* Global AI Assistant Popup */}
      {location.pathname === '/profile' && <AIAssistantPopup />}
    </div>
  );
};
