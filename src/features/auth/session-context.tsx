"use client";

import { setAccountSessionUserId } from "@/features/auth/storage-scope";
import {
  SessionProvider as NextAuthSessionProvider,
  signIn,
  signOut,
  useSession as useNextAuthSession,
} from "next-auth/react";
import { createContext, useContext, useEffect, type ReactNode } from "react";

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

const SessionBridge = ({ children }: { readonly children: ReactNode }) => {
  const { data: session, status } = useNextAuthSession();

  useEffect(() => {
    const id = session?.user?.id?.trim();
    setAccountSessionUserId(id && id.length > 0 ? id : null);
  }, [session?.user?.id]);

  const value: SessionContextValue = {
    user: session?.user?.id
      ? {
          id: session.user.id,
          email: session.user.email ?? null,
        }
      : null,
    status:
      status === "loading"
        ? "loading"
        : session?.user
          ? "authenticated"
          : "unauthenticated",
    signIn: () => {
      void signIn();
    },
    signOut: () => {
      void signOut({ callbackUrl: "/" });
    },
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const SessionProvider = ({ children }: { readonly children: ReactNode }) => {
  return (
    <NextAuthSessionProvider>
      <SessionBridge>{children}</SessionBridge>
    </NextAuthSessionProvider>
  );
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
};
