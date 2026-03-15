import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBHLKdhmyhaG3Pullo8S37-RH2tTbtf02c",
  authDomain: "blackcards-tcg-2026.firebaseapp.com",
  projectId: "blackcards-tcg-2026",
  storageBucket: "blackcards-tcg-2026.firebasestorage.app",
  messagingSenderId: "380134919949",
  appId: "1:380134919949:web:6f9b95e8c8d238c4e9ea44",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
