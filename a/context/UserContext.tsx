import { signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";

type UserProfile = {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  role?: "user" | "driver" | "guest";
  isAdmin?: boolean;
  avatar?: string;
};

type UserContextValue = {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        setUser({
          uid,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          role: data.role ?? "user",
          isAdmin: data.isAdmin ?? false,
          avatar: data.avatar ?? "https://api.adorable.io/avatars/80/abott@adorable.png",
        });
      } else {
        setUser({
          uid,
          role: "guest",
          isAdmin: false,
          avatar: "https://api.adorable.io/avatars/80/abott@adorable.png",
          email: null,
        });
      }
    } catch (e) {
      setUser(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    await loadProfile(auth.currentUser.uid);
    setLoading(false);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
