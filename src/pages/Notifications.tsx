import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, writeBatch } from 'firebase/firestore';
import { Bell, Heart, MessageCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const notifs: any[] = [];
      const batch = writeBatch(db);
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let actorData = null;
        try {
          const actorRef = await getDoc(doc(db, 'users_public', data.actorId));
          if (actorRef.exists()) actorData = actorRef.data();
        } catch (e) {
          console.error("Error fetching actor", e);
        }
        notifs.push({ id: docSnap.id, ...data, actorData });
        
        // Mark as read automatically when viewed
        if (!data.read) {
          batch.update(docSnap.ref, { read: true });
        }
      }
      
      if (snapshot.docs.some(doc => !doc.data().read)) {
        batch.commit().catch(e => console.error("Error updating notifications", e));
      }

      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-950">
      <header className="flex items-center px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="mr-3 p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Notifications</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFA5]"></div></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-stone-500 text-center">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${!notif.read ? 'bg-white dark:bg-stone-900 shadow-sm' : 'hover:bg-stone-100 dark:hover:bg-stone-800'}`}>
                <div className="relative">
                  {notif.actorData?.photoURL ? (
                    <img src={notif.actorData.photoURL} alt={notif.actorData.username} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center font-bold text-stone-500">
                      {notif.actorData?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-stone-950 bg-white dark:bg-stone-900 flex items-center justify-center">
                    {notif.type === 'like' && <Heart className="w-3 h-3 text-red-500 fill-current" />}
                    {notif.type === 'comment' && <MessageCircle className="w-3 h-3 text-blue-500 fill-current" />}
                    {notif.type === 'follow' && <UserPlus className="w-3 h-3 text-emerald-500" />}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-stone-900 dark:text-stone-100">
                    <span className="font-bold">{notif.actorData?.username || 'Someone'}</span>
                    {notif.type === 'like' && ' liked your post. '}
                    {notif.type === 'comment' && ' commented on your post: ' }
                    {notif.type === 'follow' && ' started following you. '}
                    {notif.type === 'comment' && <span className="italic text-stone-500">"{notif.content}"</span>}
                  </p>
                  <span className="text-xs text-stone-500 mt-1 block">
                    {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
