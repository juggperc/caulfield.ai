"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

/** Placeholder until Vercel Auth / Auth.js is configured. */
export type SessionUser = {
  readonly id: string;
  readonly email: string | null;
};

type SessionContextValue = {
  readonly user: SessionUser | null;
  readonly status: "unauthenticated" | "loading" | "authenticated";
  readonly signIn: () => void;
  readonly signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: { readonly children: ReactNode }) => {
  const value = useMemo<SessionContextValue>(
    () => ({
      user: null,
      status: "unauthenticated",
      signIn: () => {
        /* TODO: Vercel Auth signIn redirect */
      },
      signOut: () => {
        /* TODO: Vercel Auth signOut */
      },
    }),
    [],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
};
