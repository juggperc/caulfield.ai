import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · caulfield.ai",
  description: "Privacy policy for caulfield.ai",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-12 text-foreground">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Home
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 23, 2026</p>
      <div className="prose prose-sm mt-8 max-w-none space-y-4 text-sm text-muted-foreground">
        <p>
          This policy describes how caulfield.ai (&quot;we&quot;, &quot;us&quot;) handles information
          when you use our website and services.
        </p>
        <h2 className="text-base font-medium text-foreground">
          Account & authentication
        </h2>
        <p>
          If you sign in, our authentication provider processes identifiers such as your email
          address and provider account id. We use this to create your session and associate
          server-side data (for example saved conversations when database features are enabled)
          with your account.
        </p>
        <h2 className="text-base font-medium text-foreground">
          Workspace & AI usage
        </h2>
        <p>
          Content you submit to the assistant (messages, notes, documents, and similar) may be
          sent to model providers to generate responses. Do not submit secrets, regulated health
          data, or other information you are not allowed to share with third-party processors.
        </p>
        <h2 className="text-base font-medium text-foreground">Local storage</h2>
        <p>
          The app stores workspace data in your browser (for example notes and chat history) keyed
          to your signed-in account where applicable. Signing out clears caulfield.ai data stored
          locally on this device for that session flow.
        </p>
        <h2 className="text-base font-medium text-foreground">Contact</h2>
        <p>
          For privacy questions, contact the site operator using the contact method published for
          this deployment.
        </p>
      </div>
    </main>
  );
}
