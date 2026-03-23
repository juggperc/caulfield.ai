"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DevStateJson = {
  env: { databaseConfigured: boolean };
  user: { id: string; email: string | null; name: string | null };
  quota: {
    unlimited?: boolean;
    freeRemaining: number;
    paidRemaining: number;
    subscribed: boolean;
  };
  billingSubscription: Record<string, unknown> | null;
  userUsage: Record<string, unknown> | null;
};

const defaultWebhookTemplate = (userId: string) =>
  JSON.stringify(
    {
      type: "subscription.active",
      data: {
        metadata: { userId },
        status: "active",
        current_period_end: new Date(
          Date.now() + 30 * 86_400_000,
        ).toISOString(),
        customer_id: "dev_polar_customer",
        subscription_id: "dev_polar_subscription",
      },
    },
    null,
    2,
  );

export const DevToolsPage = () => {
  const { user, status, signIn, signOut } = useSession();
  const [state, setState] = useState<DevStateJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [webhookJson, setWebhookJson] = useState("");
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/dev/billing/state", { credentials: "include" });
    if (res.status === 401) {
      setState(null);
      return;
    }
    if (!res.ok) {
      setLoadError(`State request failed (${res.status})`);
      return;
    }
    const j = (await res.json()) as DevStateJson;
    setState(j);
    setWebhookJson((prev) =>
      prev.trim().length > 0 ? prev : defaultWebhookTemplate(j.user.id),
    );
  }, []);

  useEffect(() => {
    if (user?.id) {
      void refreshState();
    } else {
      setState(null);
    }
  }, [user?.id, refreshState]);

  const handleSimulate = async (action: string) => {
    setBusy(true);
    setLastAction(null);
    try {
      const res = await fetch("/api/dev/billing/simulate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setLastAction(j.error ?? `Failed (${res.status})`);
        return;
      }
      setLastAction(`OK: ${action}`);
      await refreshState();
    } finally {
      setBusy(false);
    }
  };

  const handleApplyWebhook = async () => {
    setBusy(true);
    setWebhookResult(null);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(webhookJson) as unknown;
      } catch {
        setWebhookResult("Invalid JSON");
        return;
      }
      const res = await fetch("/api/dev/billing/webhook-body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        applied?: boolean;
        skipped?: string;
      };
      if (!res.ok) {
        setWebhookResult(j.error ?? `Failed (${res.status})`);
        return;
      }
      setWebhookResult(
        j.skipped === "no_database"
          ? "Skipped (no database)"
          : j.applied
            ? "Applied to database"
            : "Parsed; no row update (check userId / payload shape)",
      );
      await refreshState();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-foreground">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Development only
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Billing &amp; account testing
        </h1>
        <p className="text-sm text-muted-foreground">
          Use these flows with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            npm run dev
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            DATABASE_URL
          </code>{" "}
          /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            POSTGRES_URL
          </code>
          , and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            OPENROUTER_API_KEY
          </code>{" "}
          as needed. This page is not available in production builds.
        </p>
        <p className="text-sm">
          <Link
            href="/"
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to app
          </Link>
        </p>
      </header>

      <section
        className="rounded-lg border border-border bg-card p-4 shadow-sm"
        aria-labelledby="dev-auth-heading"
      >
        <h2
          id="dev-auth-heading"
          className="text-sm font-medium text-foreground"
        >
          Account / session
        </h2>
        {status === "loading" ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading session…</p>
        ) : user ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-mono text-foreground">
                {user.name ?? user.email ?? user.id}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refreshState()}
              >
                Refresh state
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void signOut();
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in (Dev login or OAuth) to exercise quota and checkout.
            </p>
            <Button type="button" size="sm" onClick={signIn}>
              Sign in
            </Button>
          </div>
        )}
      </section>

      {user ? (
        <>
          <section
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            aria-labelledby="dev-quota-heading"
          >
            <h2
              id="dev-quota-heading"
              className="text-sm font-medium text-foreground"
            >
              Quota snapshot
            </h2>
            {loadError ? (
              <p className="mt-2 text-sm text-destructive">{loadError}</p>
            ) : state ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Database</dt>
                  <dd className="font-mono">
                    {state.env.databaseConfigured ? "connected" : "not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Unlimited</dt>
                  <dd className="font-mono">
                    {state.quota.unlimited ? "yes" : "no"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Subscribed</dt>
                  <dd className="font-mono">
                    {state.quota.subscribed ? "yes" : "no"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Free remaining</dt>
                  <dd className="font-mono">{state.quota.freeRemaining}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Paid remaining</dt>
                  <dd className="font-mono">{state.quota.paidRemaining}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
            )}
            {lastAction ? (
              <p className="mt-3 text-xs text-muted-foreground">{lastAction}</p>
            ) : null}
          </section>

          <section
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            aria-labelledby="dev-checkout-heading"
          >
            <h2
              id="dev-checkout-heading"
              className="text-sm font-medium text-foreground"
            >
              Checkout flow
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              With no{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                POLAR_CHECKOUT_URL
              </code>
              , the sidebar Subscribe link hits the real checkout route, which
              redirects to the dev mock checkout and grants a paid subscription.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/api/billing/checkout"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Open /api/billing/checkout
              </a>
              <a
                href="/api/dev/billing/mock-checkout"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Mock checkout only
              </a>
            </div>
          </section>

          <section
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            aria-labelledby="dev-sim-heading"
          >
            <h2
              id="dev-sim-heading"
              className="text-sm font-medium text-foreground"
            >
              Quick simulations
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Directly updates{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                billing_subscription
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                user_usage
              </code>{" "}
              for your signed-in user.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                size="sm"
                disabled={busy || !state?.env.databaseConfigured}
                onClick={() => void handleSimulate("grant_paid_subscriber")}
              >
                Grant paid subscriber
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || !state?.env.databaseConfigured}
                onClick={() => void handleSimulate("cancel_subscription")}
              >
                Cancel subscription
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || !state?.env.databaseConfigured}
                onClick={() => void handleSimulate("reset_usage")}
              >
                Reset usage counters
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !state?.env.databaseConfigured}
                onClick={() => void handleSimulate("exhaust_free")}
              >
                Exhaust free tier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !state?.env.databaseConfigured}
                onClick={() => void handleSimulate("exhaust_paid")}
              >
                Exhaust paid tier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !state?.env.databaseConfigured}
                onClick={() => void handleSimulate("expire_billing_period")}
              >
                Expire billing period
              </Button>
            </div>
          </section>

          <section
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            aria-labelledby="dev-webhook-heading"
          >
            <h2
              id="dev-webhook-heading"
              className="text-sm font-medium text-foreground"
            >
              Polar webhook JSON (no signature)
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              POSTs the same path logic as{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                /api/webhooks/polar
              </code>{" "}
              without HMAC. Adjust{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                userId
              </code>{" "}
              in metadata to target a user.
            </p>
            <label className="mt-3 block text-xs font-medium text-muted-foreground" htmlFor="dev-webhook-json">
              JSON body
            </label>
            <textarea
              id="dev-webhook-json"
              className="mt-1 min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
              value={webhookJson}
              onChange={(e) => setWebhookJson(e.target.value)}
              spellCheck={false}
              aria-label="Polar webhook JSON payload"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void handleApplyWebhook()}
              >
                Apply webhook payload
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!user?.id}
                onClick={() => setWebhookJson(defaultWebhookTemplate(user.id))}
              >
                Reset template
              </Button>
            </div>
            {webhookResult ? (
              <p className="mt-2 text-xs text-muted-foreground">{webhookResult}</p>
            ) : null}
          </section>

          {state?.billingSubscription || state?.userUsage ? (
            <section
              className="rounded-lg border border-border bg-muted/40 p-4"
              aria-labelledby="dev-raw-heading"
            >
              <h2
                id="dev-raw-heading"
                className="text-sm font-medium text-foreground"
              >
                Raw rows
              </h2>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
                {JSON.stringify(
                  {
                    billingSubscription: state.billingSubscription,
                    userUsage: state.userUsage,
                  },
                  null,
                  2,
                )}
              </pre>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
