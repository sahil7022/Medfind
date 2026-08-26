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
  apiKey: "AIzaSyBCqKwtFC9ezg4L2qENjpH80oCJCdIy8sY",
  authDomain: "eventify-b4860.firebaseapp.com",
  projectId: "eventify-b4860",
  storageBucket: "eventify-b4860.firebasestorage.app",
  messagingSenderId: "126759669690",
  appId: "1:126759669690:web:6fce7e99791f7b924c5783",
  measurementId: "G-E3DKVLEQND"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p);
export const registerWithEmail = (e: string, p: string) => createUserWithEmailAndPassword(auth, e, p);
export const logoutUser = () => signOut(auth);
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const onAuthChange = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);
