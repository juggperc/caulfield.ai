"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-context";
import { LogOut, UserIcon } from "lucide-react";

export const AccountSettings = () => {
  const { user, status, signIn, signOut } = useSession();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-4 md:p-8">
        <p className="text-sm text-muted-foreground animate-pulse">Loading settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <UserIcon className="size-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-lg font-semibold tracking-tight text-foreground mb-2">Sign in Required</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You need an account to view settings, manage your subscription, and access hosted AI features.
        </p>
        <Button type="button" onClick={() => signIn()}>
          Sign in to Caulfield.ai
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-8 lg:p-12">
      <div className="mx-auto w-full max-w-2xl space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account details and billing.
          </p>
        </div>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-base font-medium text-card-foreground">Profile</h2>
          <div className="grid gap-1">
            <span className="text-sm font-medium text-muted-foreground">Signed in as</span>
            <span className="text-sm text-foreground">
              {user.name ?? user.email ?? user.id}
            </span>
          </div>
          <div className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void signOut();
              }}
              className="gap-2"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-base font-medium text-card-foreground">Billing & Quota</h2>
          <p className="text-sm text-muted-foreground">
            You can subscribe to increase your query limits and access standard models.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/api/billing/checkout"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Subscribe ($20/mo)
            </a>
            {/* Future: Add billing portal link here when POLAR_ACCESS_TOKEN is implemented */}
            <Button variant="secondary" disabled>
              Manage Subscription (Coming soon)
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-sm md:p-6">
          <h2 className="text-base font-medium text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Irreversibly delete your account and all associated data. Active subscriptions must be canceled first.
          </p>
          <div className="pt-2">
            <Button variant="destructive" disabled>
              Delete Account
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
