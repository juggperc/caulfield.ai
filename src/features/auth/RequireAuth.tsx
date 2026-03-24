"use client";

import { SignInGateView } from "@/features/auth/SignInGateView";
import { useSession } from "@/features/auth/session-context";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export const RequireAuth = ({ children }: { readonly children: ReactNode }) => {
  const { status, signIn } = useSession();

  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 bg-background text-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading session"
      >
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <SignInGateView onSignIn={() => signIn()} />;
  }

  return <>{children}</>;
};
