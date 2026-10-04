import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseEnv = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
};
const missingFirebaseEnv = Object.entries(requiredFirebaseEnv)
  .filter(([, value]) => !value || value.startsWith("YOUR_"))
  .map(([name]) => name);

if (missingFirebaseEnv.length > 0) {
  throw new Error(
    `Firebase nao configurado. Preencha ${missingFirebaseEnv.join(", ")} em .env.local (use .env.example como modelo).`,
  );
}

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch { /* analytics bloqueado */ }
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const signInWithGooglePopup = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);
export const registerWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const onAuthChange = (callback: (user: typeof auth.currentUser) => void) =>
  onAuthStateChanged(auth, callback);
export { updateProfile };
export default app;
