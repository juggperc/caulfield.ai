"use client";

import { clearCaulfieldBrowserStores } from "@/features/auth/clear-client-data";
import {
  getAccountStorageScope,
  setAccountSessionUserId,
  syncLiveAccountStorageScope,
} from "@/features/auth/storage-scope";
import {
  SessionProvider as NextAuthSessionProvider,
  signOut as nextAuthSignOut,
  useSession as useNextAuthSession,
} from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

export type SessionUser = {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
};

type SessionContextValue = {
  readonly user: SessionUser | null;
  readonly status: "unauthenticated" | "loading" | "authenticated";
  readonly signIn: () => void;
  readonly signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const SessionBridge = ({ children }: { readonly children: ReactNode }) => {
  const { data: session, status } = useNextAuthSession();
  const router = useRouter();

  const id = session?.user?.id?.trim();
  const scope =
    status === "authenticated" && id && id.length > 0 && id.length < 256
      ? id
      : "anon";
  syncLiveAccountStorageScope(scope);

  useEffect(() => {
    setAccountSessionUserId(
      status === "authenticated" && id && id.length > 0 ? id : null,
    );
  }, [status, id]);

  const value: SessionContextValue = {
    user: session?.user?.id
      ? {
          id: session.user.id,
          name: session.user.name ?? null,
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
      const path =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/";
      const callbackUrl = encodeURIComponent(path || "/");
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
    },
    signOut: async () => {
      const scopeForClear = id && id.length > 0 ? id : getAccountStorageScope();
      await nextAuthSignOut({ redirect: false });
      clearCaulfieldBrowserStores(scopeForClear);
      syncLiveAccountStorageScope("anon");
      setAccountSessionUserId(null);
      window.location.assign("/");
    },
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const SessionProvider = ({ children }: { readonly children: ReactNode }) => {
  return (
    <NextAuthSessionProvider refetchOnWindowFocus basePath="/api/auth">
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
