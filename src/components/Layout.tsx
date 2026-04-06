import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { AIAssistantPopup } from './AIAssistantPopup';
import { 
  User, 
  Globe, 
  MessageSquare, 
  FileText, 
  Calendar,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { CallModal } from './CallModal';

export const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);

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
  const [outgoingCallInfo, setOutgoingCallInfo] = useState<{name?: string, photo?: string} | null>(null);

  useEffect(() => {
    const handleStartCall = (e: CustomEvent) => {
      setActiveCallId(e.detail.callId);
      setIsCaller(true);
      setOutgoingCallInfo({
        name: e.detail.receiverName,
        photo: e.detail.receiverPhoto
      });
    };
    window.addEventListener('start-call' as any, handleStartCall);
    return () => window.removeEventListener('start-call' as any, handleStartCall);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden relative">
      
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
            <p className="text-sm text-stone-400">Incoming voice call...</p>
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
          receiverName={isCaller ? outgoingCallInfo?.name : incomingCall?.callerName} 
          receiverPhoto={isCaller ? outgoingCallInfo?.photo : incomingCall?.callerPhoto}
          onClose={() => {
            setActiveCallId(null);
            setOutgoingCallInfo(null);
          }} 
        />
      )}

      {/* Top Header */}
      <header className="h-16 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center justify-center px-6 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00BFA5] text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
            O
          </div>
          <span className="font-semibold tracking-tight text-stone-900 dark:text-stone-100 text-[16px] text-center">OwambeNotes AI</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      
      {/* Bottom Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full h-20 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-around px-2 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        
        {/* 1. Reminders & Calendar */}
        <NavLink 
          to="/reminders" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <Calendar className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Reminders</span>
        </NavLink>

        {/* 2. Explore */}
        <NavLink 
          to="/tools" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <Globe className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Explore</span>
        </NavLink>

        {/* 3. Chats (Center Icon) */}
        <div className="flex items-center justify-center w-20 h-full">
          <NavLink 
            to="/chats" 
            className={({ isActive }) => `flex items-center justify-center w-16 h-16 rounded-full border-4 border-stone-50 dark:border-stone-950 bg-white dark:bg-stone-900 shadow-lg transition-transform hover:scale-105 active:scale-95 ${isActive ? 'ring-2 ring-[#00BFA5] ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-950' : ''}`}
          >
            <div className="w-12 h-12 rounded-full border-2 border-[#00BFA5] flex items-center justify-center bg-transparent">
              <MessageSquare className="w-5 h-5 text-[#00BFA5]" />
            </div>
          </NavLink>
        </div>

        {/* 4. Notes */}
        <NavLink 
          to="/" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-[#00BFA5]' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
        >
          <FileText className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Notes</span>
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
      
      {/* Global AI Assistant Popup */}
      {location.pathname === '/profile' && <AIAssistantPopup />}
    </div>
  );
};
