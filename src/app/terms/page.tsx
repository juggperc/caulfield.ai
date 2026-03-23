import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions · caulfield.ai",
  description: "Terms and conditions for caulfield.ai",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-12 text-foreground">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Home
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Terms & Conditions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 23, 2026</p>
      <div className="prose prose-sm mt-8 max-w-none space-y-4 text-sm text-muted-foreground">
        <p>
          By accessing or using caulfield.ai (&quot;Service&quot;), you agree to these terms. If you
          do not agree, do not use the Service.
        </p>
        <h2 className="text-base font-medium text-foreground">Use of the Service</h2>
        <p>
          You must sign in where required. You are responsible for activity under your account and
          for complying with applicable laws. Do not misuse the Service, attempt unauthorized
          access, or interfere with other users.
        </p>
        <h2 className="text-base font-medium text-foreground">AI outputs</h2>
        <p>
          Outputs may be inaccurate or incomplete. You are responsible for how you use generated
          content. The Service is not professional advice.
        </p>
        <h2 className="text-base font-medium text-foreground">
          Subscriptions & billing
        </h2>
        <p>
          Paid features, if offered, are governed by the checkout provider&apos;s terms and any
          pricing shown at purchase. Fees and renewal terms apply as disclosed at the point of sale.
        </p>
        <h2 className="text-base font-medium text-foreground">Disclaimer</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind, to the fullest
          extent permitted by law.
        </p>
        <h2 className="text-base font-medium text-foreground">Changes</h2>
        <p>
          We may update these terms or the Service. Continued use after changes constitutes
          acceptance of the updated terms where permitted by law.
        </p>
      </div>
    </main>
  );
}
