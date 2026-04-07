import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
let firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check for missing environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !import.meta.env[envVar]
);

try {
  // Use Vite's import.meta.glob to optionally import the file without breaking the build if missing
  const localConfigs = import.meta.glob('../firebase-applet-config.json', { eager: true });
  const configPath = '../firebase-applet-config.json';
  if (localConfigs[configPath]) {
    const localConfig = (localConfigs[configPath] as any).default || localConfigs[configPath];
    if (localConfig && Object.keys(localConfig).length > 0) {
      firebaseConfig = { ...firebaseConfig, ...localConfig };
    }
  }
} catch (e) {
  console.warn('Local firebase config not found, using environment variables or defaults.');
}

if (missingEnvVars.length > 0 && !firebaseConfig.apiKey) {
  console.warn(`Missing Firebase environment variables: ${missingEnvVars.join(', ')}. Please check your .env file.`);
}

const app = initializeApp(firebaseConfig);
console.log('Firebase App initialized successfully');

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
console.log('Firestore initialized successfully');

export const storage = getStorage(app);
console.log('Firebase Storage initialized successfully');

// Suppress Firestore BloomFilter warnings
setLogLevel('error');

export const auth = getAuth(app);
console.log('Firebase Auth initialized successfully');

export const googleProvider = new GoogleAuthProvider();

export { signInAnonymously };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Only throw for permission errors as per the directive, to avoid crashing the app on network/offline errors
  if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('missing or insufficient permissions')) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Test connection on load
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ", error.message);
    } else if (error instanceof Error && (error.message.toLowerCase().includes('permission') || error.message.toLowerCase().includes('missing or insufficient permissions'))) {
      // Connection successful, but permission denied as expected
      console.log("Firebase connection successful (permission denied on test document).");
    } else {
      console.error("Firebase connection test failed: ", error);
    }
  }
}
testConnection();
