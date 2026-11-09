"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface User {
  name: string;
}

interface SessionValue {
  user: User | null;
  login: (user: User | null) => void;
  signOut: () => void;
}

const STORAGE_KEY = "av_user";

const SessionContext = createContext<SessionValue | null>(null);

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as User).name === "string"
    ) {
      return { name: (parsed as User).name };
    }
  } catch {}
  return null;
}

function writeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // First render is always "no session" so server and client markup match.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readUser());
  }, []);

  const login = useCallback((next: User | null) => {
    setUser(next);
    writeUser(next);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    writeUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, signOut }), [user, login, signOut]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
