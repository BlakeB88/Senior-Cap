// FontSizeProvider.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type FontCtx = {
  scale: number;                 // your app multiplier (e.g., 0.85–1.6)
  setScale: (n: number) => void;
  respectSystem: boolean;        // if true, also respect OS setting
  setRespectSystem: (b: boolean) => void;
};

const Ctx = createContext<FontCtx | undefined>(undefined);


export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [respectSystem, setRespectSystem] = useState(true);

  // load/save user preference
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("font_prefs");
      if (raw) {
        const { scale: s = 1, respectSystem: r = true } = JSON.parse(raw);
        setScale(s); setRespectSystem(r);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("font_prefs", JSON.stringify({ scale, respectSystem }));
  }, [scale, respectSystem]);

  return (
    <Ctx.Provider value={{ scale, setScale, respectSystem, setRespectSystem }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFontPrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFontPrefs must be used within FontSizeProvider");
  return v;
}
