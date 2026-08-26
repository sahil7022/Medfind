import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase Configuration for MedFind (eventify-b4860)
export const firebaseConfig = {
  apiKey: "AIzaSyBCqKwtFC9ezg4L2qENjpH80oCJCdIy8sY",
  authDomain: "eventify-b4860.firebaseapp.com",
  projectId: "eventify-b4860",
  storageBucket: "eventify-b4860.firebasestorage.app",
  messagingSenderId: "126759669690",
  appId: "1:126759669690:web:6fce7e99791f7b924c5783",
  measurementId: "G-E3DKVLEQND"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helper Functions Exports
export const registerWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// Attach Firebase Services to Window for Global Usage
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseAnalytics = analytics;
window.registerWithEmail = registerWithEmail;
window.loginWithEmail = loginWithEmail;
window.logoutUser = logoutUser;
window.loginWithGoogle = loginWithGoogle;
window.onAuthChange = onAuthChange;

console.log("🔥 Firebase App & Auth Services initialized successfully for MedFind!");
