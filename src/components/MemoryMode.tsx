"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Global Memory ON/OFF switch. OFF means briefs are generated without any recall ("before" in the demo).

interface MemoryModeValue {
  memoryEnabled: boolean;
  setMemoryEnabled: (on: boolean) => void;
}

const MemoryModeContext = createContext<MemoryModeValue | null>(null);
const STORAGE_KEY = "khetsmriti.memoryEnabled";

export function MemoryModeProvider({ children }: { children: React.ReactNode }) {
  const [memoryEnabled, setState] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "false") setState(false);
    } catch {
      // storage unavailable (private mode); keep the default
    }
  }, []);

  const setMemoryEnabled = useCallback((on: boolean) => {
    setState(on);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(on));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ memoryEnabled, setMemoryEnabled }), [memoryEnabled, setMemoryEnabled]);
  return <MemoryModeContext.Provider value={value}>{children}</MemoryModeContext.Provider>;
}

export function useMemoryMode(): MemoryModeValue {
  const ctx = useContext(MemoryModeContext);
  if (!ctx) throw new Error("useMemoryMode must be used inside MemoryModeProvider");
  return ctx;
}
