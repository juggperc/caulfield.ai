"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-context";
import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const safeCallbackUrl = (raw: string | null): string => {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
};

export const SignInClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await getProviders();
        if (cancelled || !p) {
          if (!cancelled) setProviderIds([]);
          return;
        }
        setProviderIds(Object.keys(p));
      } catch {
        if (!cancelled) setLoadError("Could not load sign-in options.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOAuthSignIn = useCallback(
    (providerId: string) => {
      void signIn(providerId, { callbackUrl });
    },
    [callbackUrl],
  );

  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Continue to caulfield.ai with a linked account.
            </p>
          </div>

          {loadError ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : null}

          {providerIds.length === 0 && !loadError ? (
            <p className="text-center text-sm text-muted-foreground">
              No sign-in providers are configured on this deployment. Set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                GITHUB_ID
              </code>{" "}
              /{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                GITHUB_SECRET
              </code>{" "}
              or Google OAuth in the server environment, and set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                AUTH_SECRET
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                AUTH_URL
              </code>{" "}
              to your production URL.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {providerIds.map((id) => (
                <li key={id}>
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 w-full"
                    onClick={() => {
                      handleOAuthSignIn(id);
                    }}
                  >
                    {id === "github"
                      ? "Continue with GitHub"
                      : id === "google"
                        ? "Continue with Google"
                        : id === "dev"
                          ? "Dev login (local only)"
                          : `Continue with ${id}`}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link
              href="/"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};
