import { SignInClient } from "@/app/sign-in/sign-in-client";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background text-muted-foreground"
          role="status"
          aria-label="Loading sign-in"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <span className="text-sm">Loading…</span>
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
