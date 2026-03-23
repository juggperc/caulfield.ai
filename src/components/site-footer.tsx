import Link from "next/link";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-background px-4 py-3 text-center text-[11px] text-muted-foreground">
      <nav
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
        aria-label="Legal"
      >
        <Link
          href="/privacy"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        <span className="text-border" aria-hidden>
          ·
        </span>
        <Link
          href="/terms"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          Terms & Conditions
        </Link>
      </nav>
    </footer>
  );
};
