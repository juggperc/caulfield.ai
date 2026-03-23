"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-context";
import { Loader2, LogIn } from "lucide-react";
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
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight text-card-foreground">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat, notes, documents, and research require a signed-in account. Your
            workspace data is stored per account on this device and on our servers
            where configured.
          </p>
          <Button
            type="button"
            className="gap-2"
            onClick={() => {
              signIn();
            }}
          >
            <LogIn className="size-4" aria-hidden />
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
