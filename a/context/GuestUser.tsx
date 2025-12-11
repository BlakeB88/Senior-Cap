import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { db } from "../firebaseConfig";

interface GuestContextType {
  guestId: string | null;
  loading: boolean;
}

const GuestContext = createContext<GuestContextType>({
  guestId: null,
  loading: true,
});

export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeGuest = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));

        let storedGuestId = await AsyncStorage.getItem("guestId");

        if (storedGuestId) {
          const guestRef = doc(db, "guests", storedGuestId);
          const docSnap = await getDoc(guestRef);

          if (docSnap.exists()) {
            setGuestId(storedGuestId);
            setLoading(false);
            return;
          }
        }

        // Create new guest
        const newGuestId = uuidv4();
        const guestData = {
          guestId: newGuestId,
          role: "guest",
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        };

        await setDoc(doc(db, "guests", newGuestId), guestData);
        await AsyncStorage.setItem("guestId", newGuestId);
        setGuestId(newGuestId);
      } catch (error) {
        console.error("Error initializing guest:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeGuest();
  }, []);

  return (
    <GuestContext.Provider value={{ guestId, loading }}>
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = () => useContext(GuestContext);
