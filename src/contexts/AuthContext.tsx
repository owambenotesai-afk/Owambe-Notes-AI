import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType, signInAnonymously } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  logOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signInWithEmail: (identifier: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateEmailAddress: (newEmail: string, currentPassword?: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logOut: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  signInAsGuest: async () => {},
  resendVerificationEmail: async () => {},
  updateEmailAddress: async () => {},
  updateUserPassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const generateUserId = () => {
  let id = '';
  const length = Math.floor(Math.random() * 3) + 6; // 6 to 8 digits
  for (let i = 0; i < length; i++) {
    if (i === 0) {
      id += Math.floor(Math.random() * 9) + 1;
    } else {
      id += Math.floor(Math.random() * 10);
    }
  }
  return id;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const publicRef = doc(db, 'users_public', currentUser.uid);
        
        // Set online status
        if (currentUser.emailVerified || currentUser.isAnonymous) {
          const batch = writeBatch(db);
          batch.update(userRef, {
            online: true,
            lastSeen: new Date().toISOString()
          });
          batch.update(publicRef, {
            online: true,
            lastSeen: new Date().toISOString()
          });
          batch.commit().catch(e => console.error("Error updating online status:", e));
        }

        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });
      } catch (error) {
        console.error('Error ensuring user profile:', error);
      }
      
      setLoading(false);
    });

    const handleBeforeUnload = () => {
      if (auth.currentUser && (auth.currentUser.emailVerified || auth.currentUser.isAnonymous)) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const publicRef = doc(db, 'users_public', auth.currentUser.uid);
        // We use a beacon or synchronous XHR if possible, but updateDoc might not finish.
        // For simplicity in this environment, we just try to update it.
        updateDoc(userRef, {
          online: false,
          lastSeen: new Date().toISOString()
        }).catch(() => {});
        updateDoc(publicRef, {
          online: false,
          lastSeen: new Date().toISOString()
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const logOut = async () => {
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const publicRef = doc(db, 'users_public', auth.currentUser.uid);
        const batch = writeBatch(db);
        batch.update(userRef, {
          online: false,
          lastSeen: new Date().toISOString()
        });
        batch.update(publicRef, {
          online: false,
          lastSeen: new Date().toISOString()
        });
        await batch.commit().catch(console.error);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    // Check if username is unique
    const publicUsersRef = collection(db, 'users_public');
    const q = query(publicUsersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('Username is already taken');
    }

    // Generate unique userId
    let userId = generateUserId();
    let isUnique = false;
    while (!isUnique) {
      const idQuery = query(publicUsersRef, where('userId', '==', userId));
      const idSnapshot = await getDocs(idQuery);
      if (idSnapshot.empty) {
        isUnique = true;
      } else {
        userId = generateUserId();
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await sendEmailVerification(user);

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    batch.set(doc(db, 'users', user.uid), {
      uid: user.uid,
      username,
      email,
      userId,
      photoURL: '',
      bio: '',
      createdAt: now,
      online: false, // Will be set to true upon verified login
      lastSeen: now
    });

    batch.set(doc(db, 'users_public', user.uid), {
      uid: user.uid,
      username,
      userId,
      photoURL: '',
      bio: '',
      createdAt: now,
      online: false,
      lastSeen: now
    });

    await batch.commit();
    
    // Sign out the user so they have to verify their email before logging in
    await signOut(auth);
  };

  const signInWithEmail = async (identifier: string, password: string) => {
    let emailToUse = identifier;

    // Check if identifier is an email or username
    if (!identifier.includes('@')) {
      // It's a username, look up the email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', identifier));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        const error = new Error('User not found');
        (error as any).code = 'auth/user-not-found';
        throw error;
      }
      
      emailToUse = querySnapshot.docs[0].data().email;
    }

    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
    
    // Enforce email verification
    if (!userCredential.user.emailVerified) {
      throw new Error('auth/email-not-verified');
    }
    
    // Set online status
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    batch.update(doc(db, 'users', userCredential.user.uid), {
      online: true,
      lastSeen: now
    });
    batch.update(doc(db, 'users_public', userCredential.user.uid), {
      online: true,
      lastSeen: now
    });
    await batch.commit();
  };

  const signInAsGuest = async () => {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    // Check if profile exists, if not create it
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const userId = generateUserId();
      const username = `guest_${userId}`;

      batch.set(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        email: '',
        userId,
        photoURL: '',
        bio: 'Guest User',
        createdAt: now,
        online: true,
        lastSeen: now,
        isAnonymous: true
      });

      batch.set(doc(db, 'users_public', user.uid), {
        uid: user.uid,
        username,
        userId,
        photoURL: '',
        bio: 'Guest User',
        createdAt: now,
        online: true,
        lastSeen: now,
        isAnonymous: true
      });

      await batch.commit();
    } else {
      // Just update online status
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      batch.update(userRef, {
        online: true,
        lastSeen: now
      });
      batch.update(doc(db, 'users_public', user.uid), {
        online: true,
        lastSeen: now
      });
      await batch.commit();
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const updateEmailAddress = async (newEmail: string, currentPassword?: string) => {
    if (!auth.currentUser) throw new Error('No user logged in');
    
    // Re-authenticate if password is provided
    if (currentPassword && auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
    }
    
    await updateEmail(auth.currentUser, newEmail);
    
    // Update email in Firestore
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', auth.currentUser.uid), { email: newEmail });
    await batch.commit();
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser) throw new Error('No user logged in');
    if (!auth.currentUser.email) throw new Error('User has no email');
    
    // Re-authenticate
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    
    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logOut, signUpWithEmail, signInWithEmail, signInAsGuest, resendVerificationEmail, updateEmailAddress, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
