import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBCqKwtFC9ezg4L2qENjpH80oCJCdIy8sY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'eventify-b4860.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'eventify-b4860',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'eventify-b4860.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '126759669690',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:126759669690:web:6fce7e99791f7b924c5783',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-E3DKVLEQND'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p);
export const registerWithEmail = (e: string, p: string) => createUserWithEmailAndPassword(auth, e, p);
export const logoutUser = () => signOut(auth);
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const onAuthChange = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);
