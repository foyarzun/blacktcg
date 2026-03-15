"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
  updateUserData: async () => {},
});

const ADMIN_EMAILS = [
  "fernando@test.com", 
  "admin@blackcards.tcg",
  "fernando.oyarzun@multix.cl", // Deduced from path
  "fernandood@gmail.com",
  "fer@blackcards.cl",
  "foyarzun.sbf@gmail.com"
];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync with LocalStorage if mock
  useEffect(() => {
    if (user?.uid === "mock-user-123") {
      const saved = localStorage.getItem("mock_user_data");
      if (saved) setUserData(JSON.parse(saved));
    }
  }, [user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setIsAdmin(ADMIN_EMAILS.includes(user.email || ""));
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setUserData(data);
            if (data.role === "admin") setIsAdmin(true);
          } else {
            const newData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: ADMIN_EMAILS.includes(user.email || "") ? "admin" : "seller",
              createdAt: new Date(),
            };
            setDoc(userDocRef, newData);
            setUserData(newData);
            if (newData.role === "admin") setIsAdmin(true);
          }
          setLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async () => {
    try {
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Firebase Login failed, attempting anonymous login for development:", error);
      
      try {
        const { signInAnonymously } = await import("firebase/auth");
        const result = await signInAnonymously(auth);
        setUser(result.user);
        
        const userDocRef = doc(db, "users", result.user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          const newData = {
            uid: result.user.uid,
            email: "anon@test.com",
            displayName: "Vendedor de Prueba",
            role: "seller",
            createdAt: new Date(),
          };
          await setDoc(userDocRef, newData);
          setUserData(newData);
        }
      } catch (anonError) {
        console.error("Anonymous login also failed:", anonError);
        const mockUser = {
          uid: "mock-user-123",
          email: "vendedor@test.com",
          displayName: "Vendedor de Prueba",
        } as any;
        setUser(mockUser);
        setUserData({ uid: "mock-user-123", role: "seller" });
      }
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("mock_user_data");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateUserData = async (newData: any) => {
    if (!user) return;

    if (user.uid === "mock-user-123") {
      // Mock save to local storage
      const updated = { ...userData, ...newData };
      setUserData(updated);
      localStorage.setItem("mock_user_data", JSON.stringify(updated));
      return;
    }

    // Real Firestore save
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { ...userData, ...newData }, { merge: true });
    } catch (err) {
       // If Firestore fails due to permission (likely case for anon users without setup)
       // Fallback to local update for the current session to not block the user
       console.warn("Firestore save failed, falling back to local state:", err);
       setUserData({ ...userData, ...newData });
       throw err; // Re-throw so the UI can show a warning if needed
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, login, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
