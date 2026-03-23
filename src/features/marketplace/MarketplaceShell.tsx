"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STORAGE_KEYS } from "@/features/ai-agent/storage";
import { cn } from "@/lib/utils";
import { BookOpen, ExternalLink, Github, Globe, Search } from "lucide-react";
import { useState, type ReactNode } from "react";

const ConnectorStatusPill = ({ enabled }: { readonly enabled: boolean }) => (
  <span
    className={cn(
      "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
      enabled
        ? "bg-foreground/10 text-foreground"
        : "bg-muted text-muted-foreground",
    )}
    aria-label={enabled ? "Connector enabled" : "Connector off"}
  >
    {enabled ? "On" : "Off"}
  </span>
);

const ConnectorCardFrame = ({
  icon,
  title,
  description,
  link,
  enabled,
  children,
  footer,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly link: ReactNode;
  readonly enabled: boolean;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) => (
  <article className="flex h-full min-h-[220px] flex-col rounded-lg border border-border bg-card p-3.5 shadow-sm md:min-h-[240px]">
    <div className="flex gap-3">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <ConnectorStatusPill enabled={enabled} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-2">{link}</div>
      </div>
    </div>
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">{children}</div>
    {footer ? <div className="mt-2 shrink-0">{footer}</div> : null}
  </article>
);

const ConnectorSection = ({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <section aria-labelledby={`${id}-heading`} className="space-y-3">
    <div className="flex items-center gap-3">
      <h2
        id={`${id}-heading`}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h2>
      <div className="h-px min-w-0 flex-1 bg-border" aria-hidden />
    </div>
    {children}
  </section>
);

const linkClass =
  "inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ApiKeyConnectorCardProps = {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly docsUrl: string;
  readonly docsLinkLabel: string;
  readonly apiKeyLabel: string;
  readonly storageKey: string;
  readonly enabledStorageKey: string;
};

const ApiKeyConnectorCard = ({
  icon,
  title,
  description,
  docsUrl,
  docsLinkLabel,
  apiKeyLabel,
  storageKey,
  enabledStorageKey,
}: ApiKeyConnectorCardProps) => {
  const [apiKey, setApiKey] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(storageKey) ?? ""),
  );
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined"
      ? false
      : localStorage.getItem(enabledStorageKey) === "1",
  );

  const persistKey = (v: string) => {
    setApiKey(v);
    localStorage.setItem(storageKey, v);
  };

  const persistEnabled = (v: boolean) => {
    setEnabled(v);
    localStorage.setItem(enabledStorageKey, v ? "1" : "0");
  };

  const effectiveOn = enabled && apiKey.trim().length > 0;

  return (
    <ConnectorCardFrame
      icon={icon}
      title={title}
      description={description}
      enabled={effectiveOn}
      link={
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {docsLinkLabel}
          <ExternalLink className="size-3 opacity-70" aria-hidden />
        </a>
      }
      footer={
        <p className="text-[11px] leading-snug text-muted-foreground">
          Keys never leave your browser except inside your own chat requests to
          Caulfield&apos;s API, which forwards them to the vendor over HTTPS.
        </p>
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${storageKey}-key`} className="text-xs">
          {apiKeyLabel}
        </Label>
        <Input
          id={`${storageKey}-key`}
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => persistKey(e.target.value)}
          placeholder="Paste key (stored locally only)"
          className="text-sm"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => persistEnabled(e.target.checked)}
          className="size-4 rounded border-border"
        />
        Enable in Chat
      </label>
    </ConnectorCardFrame>
  );
};

const NativeSearchCard = () => {
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined"
      ? false
      : localStorage.getItem(STORAGE_KEYS.nativeSearchEnabled) === "1",
  );

  const persistEnabled = (v: boolean) => {
    setEnabled(v);
    localStorage.setItem(STORAGE_KEYS.nativeSearchEnabled, v ? "1" : "0");
  };

  return (
    <ConnectorCardFrame
      icon={<Globe className="size-5" />}
      title="Built-in web lookup"
      description="DuckDuckGo instant answers plus Wikipedia search — runs on Caulfield.ai servers, no third-party API key."
      enabled={enabled}
      link={
        <a
          href="https://www.mediawiki.org/wiki/API:Main_page"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, "text-primary")}
        >
          Wikimedia API overview
          <ExternalLink className="size-3 opacity-70" aria-hidden />
        </a>
      }
      footer={
        <p className="text-[11px] leading-snug text-muted-foreground">
          Exposes{" "}
          <code className="rounded bg-muted px-1">native_web_lookup</code> in
          chat. Respect site terms; results may be incomplete.
        </p>
      }
    >
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => persistEnabled(e.target.checked)}
          className="size-4 rounded border-border"
        />
        Enable in Chat
      </label>
    </ConnectorCardFrame>
  );
};

const GithubConnectorCard = () => {
  const [token, setToken] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(STORAGE_KEYS.githubToken) ?? ""),
  );
  const [enabled, setEnabled] = useState(() =>
    typeof window === "undefined"
      ? false
      : localStorage.getItem(STORAGE_KEYS.githubEnabled) === "1",
  );

  const persistToken = (v: string) => {
    setToken(v);
    localStorage.setItem(STORAGE_KEYS.githubToken, v);
  };

  const persistEnabled = (v: boolean) => {
    setEnabled(v);
    localStorage.setItem(STORAGE_KEYS.githubEnabled, v ? "1" : "0");
  };

  return (
    <ConnectorCardFrame
      icon={<Github className="size-5" />}
      title="GitHub"
      description="Search public repositories, read READMEs, and fetch text files via the GitHub REST API. Works without a token at a lower rate limit."
      enabled={enabled}
      link={
        <a
          href="https://docs.github.com/en/rest"
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          REST API docs
          <ExternalLink className="size-3 opacity-70" aria-hidden />
        </a>
      }
      footer={
        <p className="text-[11px] leading-snug text-muted-foreground">
          Token is sent only with your chat requests so the server can call
          GitHub on your behalf. Without a token, unauthenticated limits apply.
        </p>
      }
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="github-pat" className="text-xs">
          Personal access token (optional)
        </Label>
        <Input
          id="github-pat"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => persistToken(e.target.value)}
          placeholder="ghp_… (stored locally only)"
          className="text-sm"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => persistEnabled(e.target.checked)}
          className="size-4 rounded border-border"
        />
        Enable in Chat
      </label>
    </ConnectorCardFrame>
  );
};

export const MarketplaceShell = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <ConnectorSection id="built-in" title="Built-in">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NativeSearchCard />
              <GithubConnectorCard />
            </div>
          </ConnectorSection>
          <ConnectorSection id="api-keys" title="API keys">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ApiKeyConnectorCard
                icon={<BookOpen className="size-5" aria-hidden />}
                title="Context7"
                description="Resolve library IDs and fetch up-to-date documentation snippets for frameworks and packages."
                docsUrl="https://context7.com/dashboard"
                docsLinkLabel="Get API key"
                apiKeyLabel="Context7 API key"
                storageKey={STORAGE_KEYS.context7ApiKey}
                enabledStorageKey={STORAGE_KEYS.context7Enabled}
              />
              <ApiKeyConnectorCard
                icon={<Search className="size-5" aria-hidden />}
                title="Exa Search"
                description="Neural / keyword web search for research, links, and fresh context."
                docsUrl="https://dashboard.exa.ai/api-keys"
                docsLinkLabel="Get API key"
                apiKeyLabel="Exa API key"
                storageKey={STORAGE_KEYS.exaApiKey}
                enabledStorageKey={STORAGE_KEYS.exaEnabled}
              />
            </div>
          </ConnectorSection>
        </div>
      </div>
    </div>
  );
};
