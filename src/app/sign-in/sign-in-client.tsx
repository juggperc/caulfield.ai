"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/features/auth/session-context";
import { Logo } from "@/features/sidebar/components/Logo";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

const safeCallbackUrl = (raw: string | null): string => {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
};

type AppConfigJson = {
  credentialAuthConfigured?: boolean;
  authProvidersConfigured?: boolean;
  altchaDevBypass?: boolean;
  databaseConfigured?: boolean;
};

export const SignInClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [credentialAuthConfigured, setCredentialAuthConfigured] = useState<
    boolean | null
  >(null);
  const [altchaDevBypass, setAltchaDevBypass] = useState(false);
  const [databaseConfigured, setDatabaseConfigured] = useState<boolean | null>(
    null,
  );

  const [panel, setPanel] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [altchaPayload, setAltchaPayload] = useState<string | null>(null);
  const [altchaKey, setAltchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [altchaScriptReady, setAltchaScriptReady] = useState(false);
  const altchaHostRef = useRef<HTMLElement | null>(null);

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
        const res = await fetch("/api/auth/providers", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setProviderIds([]);
          setLoadError("Could not load sign-in options.");
          return;
        }
        const p = (await res.json()) as Record<string, unknown> | null;
        if (!p || typeof p !== "object") {
          setProviderIds([]);
          return;
        }
        setProviderIds(Object.keys(p));
      } catch {
        if (!cancelled) {
          setLoadError("Could not load sign-in options.");
          setProviderIds([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/config")
      .then((r) => r.json())
      .then((j: AppConfigJson) => {
        if (cancelled) return;
        const cred =
          j.credentialAuthConfigured ?? j.authProvidersConfigured ?? false;
        setCredentialAuthConfigured(Boolean(cred));
        setAltchaDevBypass(Boolean(j.altchaDevBypass));
        setDatabaseConfigured(Boolean(j.databaseConfigured));
      })
      .catch(() => {
        if (!cancelled) {
          setCredentialAuthConfigured(null);
          setDatabaseConfigured(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await import("altcha");
        if (!cancelled) setAltchaScriptReady(true);
      } catch {
        if (!cancelled) setLoadError("Could not load ALTCHA widget.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAltchaStateChange = useCallback((ev: Event) => {
    const ce = ev as CustomEvent<{ state?: string; payload?: string }>;
    const { state, payload } = ce.detail ?? {};
    if (state === "verified" && typeof payload === "string" && payload) {
      setAltchaPayload(payload);
    }
    if (state === "error" || state === "expired") {
      setAltchaPayload(null);
    }
  }, []);

  const resetAltcha = useCallback(() => {
    setAltchaPayload(null);
    setAltchaKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setFormError(null);
    resetAltcha();
  }, [panel, resetAltcha]);

  const hasCredentialsProvider = providerIds.includes("credentials");
  const hasDevProvider = providerIds.includes("dev");
  const requireAltcha = !altchaDevBypass;

  const handleDevSignIn = useCallback(() => {
    void signIn("dev", { callbackUrl, redirect: true });
  }, [callbackUrl]);

  useEffect(() => {
    const el = altchaHostRef.current;
    if (!el || altchaDevBypass || !altchaScriptReady) return;
    el.addEventListener("statechange", handleAltchaStateChange);
    return () => {
      el.removeEventListener("statechange", handleAltchaStateChange);
    };
  }, [
    altchaDevBypass,
    altchaKey,
    altchaScriptReady,
    handleAltchaStateChange,
  ]);

  const handleSubmitSignIn = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      if (!hasCredentialsProvider) {
        setFormError("Username/password sign-in is not available.");
        return;
      }
      if (requireAltcha && !altchaPayload) {
        setFormError("Complete the verification challenge first.");
        return;
      }
      setBusy(true);
      try {
        const res = await signIn("credentials", {
          username: username.trim(),
          password,
          altcha: altchaDevBypass ? "" : (altchaPayload ?? ""),
          callbackUrl,
          redirect: false,
        });
        if (res?.error) {
          setFormError("Invalid username or password.");
          resetAltcha();
          return;
        }
        if (res?.ok) {
          router.replace(callbackUrl);
          router.refresh();
        }
      } finally {
        setBusy(false);
      }
    },
    [
      altchaDevBypass,
      altchaPayload,
      callbackUrl,
      hasCredentialsProvider,
      password,
      requireAltcha,
      resetAltcha,
      router,
      username,
    ],
  );

  const handleSubmitRegister = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      if (requireAltcha && !altchaPayload) {
        setFormError("Complete the verification challenge first.");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            altcha: altchaDevBypass ? "" : (altchaPayload ?? ""),
          }),
        });
        if (!res.ok) {
          let message = "Could not register. Try again.";
          try {
            const data = (await res.json()) as { error?: unknown };
            if (typeof data.error === "string" && data.error.trim()) {
              message = data.error;
            }
          } catch {
            /* keep default */
          }
          setFormError(message);
          resetAltcha();
          return;
        }
        const signRes = await signIn("credentials", {
          username: username.trim(),
          password,
          altcha: altchaDevBypass ? "" : (altchaPayload ?? ""),
          callbackUrl,
          redirect: false,
        });
        if (signRes?.error) {
          setFormError("Account created. Sign in with your new credentials.");
          setPanel("signin");
          resetAltcha();
          return;
        }
        if (signRes?.ok) {
          router.replace(callbackUrl);
          router.refresh();
        }
      } catch {
        setFormError("Something went wrong. Try again.");
        resetAltcha();
      } finally {
        setBusy(false);
      }
    },
    [
      altchaDevBypass,
      altchaPayload,
      callbackUrl,
      password,
      requireAltcha,
      resetAltcha,
      router,
      username,
    ],
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
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <Logo variant="auth" />
          <div className="space-y-6 p-8 pt-7">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
                Sign in
              </h1>
              <p className="text-sm text-muted-foreground">
                Use your username and password. New here? Create an account.
              </p>
            </div>

            {loadError ? (
              <p className="text-center text-sm text-destructive" role="alert">
                {loadError}
              </p>
            ) : null}

            {credentialAuthConfigured === false && !loadError ? (
              <p
                className="text-center text-sm text-muted-foreground"
                role="status"
              >
                Sign-in is not fully configured. Set{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  DATABASE_URL
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  AUTH_SECRET
                </code>
                , and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  ALTCHA_HMAC_KEY
                </code>{" "}
                (or{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  ALTCHA_DEV_BYPASS=1
                </code>{" "}
                in development). See README.
              </p>
            ) : null}

            {hasDevProvider ? (
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={handleDevSignIn}
              >
                Dev login (local only)
              </Button>
            ) : null}

            {hasCredentialsProvider ? (
              <>
                <div
                  className="flex rounded-lg border border-border p-1"
                  role="tablist"
                  aria-label="Account"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={panel === "signin"}
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      panel === "signin"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => {
                      setPanel("signin");
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={panel === "register"}
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      panel === "register"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => {
                      setPanel("register");
                    }}
                  >
                    Create account
                  </button>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={
                    panel === "signin"
                      ? handleSubmitSignIn
                      : handleSubmitRegister
                  }
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <Input
                      id="signin-username"
                      name="username"
                      autoComplete="username"
                      value={username}
                      onChange={(ev) => {
                        setUsername(ev.target.value);
                      }}
                      className="h-11"
                      required
                      aria-required
                    />
                    <p className="text-xs text-muted-foreground">
                      3–32 characters: lowercase letters, numbers, underscores.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete={
                        panel === "signin"
                          ? "current-password"
                          : "new-password"
                      }
                      value={password}
                      onChange={(ev) => {
                        setPassword(ev.target.value);
                      }}
                      className="h-11"
                      required
                      aria-required
                    />
                  </div>

                  {altchaDevBypass ? (
                    <p className="text-xs text-muted-foreground">
                      ALTCHA verification is bypassed in this development
                      environment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Verification
                      </span>
                      {altchaScriptReady ? (
                        <div key={altchaKey} className="block w-full">
                          <altcha-widget
                            ref={altchaHostRef}
                            challengeurl="/api/altcha/challenge"
                            credentials="include"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Loading verification…
                        </p>
                      )}
                    </div>
                  )}

                  {formError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {formError}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-11 w-full"
                    disabled={busy}
                  >
                    {panel === "signin" ? "Sign in" : "Create account"}
                  </Button>
                </form>
              </>
            ) : !loadError ? (
              <div
                className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground"
                role="status"
              >
                <p className="font-medium text-foreground">
                  Sign-in is not wired up on this deployment
                </p>
                {databaseConfigured === false ? (
                  <p>
                    Add a Postgres URL to the server environment (
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      DATABASE_URL
                    </code>{" "}
                    or{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      POSTGRES_URL
                    </code>
                    ), run{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      npm run db:push
                    </code>
                    , then redeploy. Username/password auth only registers when
                    the app can connect to the database.
                  </p>
                ) : (
                  <p>
                    The credentials provider did not load. Confirm{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      DATABASE_URL
                    </code>
                    ,{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      AUTH_SECRET
                    </code>
                    , and{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      ALTCHA_HMAC_KEY
                    </code>{" "}
                    on the host, redeploy, and check server logs.
                  </p>
                )}
              </div>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              <Link
                href="/"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
