"use client";

import { useResearch } from "@/features/research/research-provider";
import type { ResearchSnippet } from "@/features/research/research-types";
import { WorkspacePanelHeader } from "@/features/shell/WorkspacePanelHeader";
import { cn } from "@/lib/utils";
import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ApiOk = {
  ok: true;
  topic: string;
  summary: string;
  snippets: ResearchSnippet[];
};

type ApiErr = { error: string };

type ResearchShellProps = {
  /** When true, omit workspace header; parent supplies title (e.g. dialog). */
  readonly embedded?: boolean;
};

export const ResearchShell = ({ embedded = false }: ResearchShellProps) => {
  const { snippets, addSnippets, removeSnippet, clearAll } = useResearch();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRouterConfigured, setOpenRouterConfigured] = useState(false);

  useEffect(() => {
    void fetch("/api/config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c) setOpenRouterConfigured(Boolean(c.openRouterConfigured));
      })
      .catch(() => setOpenRouterConfigured(false));
  }, []);

  const handleRun = useCallback(async () => {
    const t = topic.trim();
    if (!t || busy) return;
    if (!openRouterConfigured) {
      setError("AI is not available on this deployment.");
      return;
    }
    setBusy(true);
    setError(null);
    setLastSummary(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ topic: t }),
      });
      const data = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !("ok" in data) || !data.ok) {
        const msg =
          "error" in data ? data.error : `Request failed (${res.status})`;
        setError(msg);
        return;
      }
      addSnippets(data.snippets);
      setLastSummary(data.summary || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }, [topic, busy, addSnippets, openRouterConfigured]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleRun();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-muted",
        embedded ? "min-h-0" : "min-h-0 flex-1",
      )}
    >
      {embedded ? null : <WorkspacePanelHeader title="Research snippets" />}

      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-5",
          embedded
            ? "min-h-0"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        )}
      >
        <div className="rounded-lg border border-border bg-card/60 p-3 text-sm text-card-foreground">
          <p className="font-medium text-foreground">Use research from chat</p>
          <p className="mt-1 text-muted-foreground">
            Turn on the <strong className="text-foreground">microscope</strong>{" "}
            in the chat toolbar, then ask your question—the assistant can run{" "}
            <strong className="text-foreground">deep research</strong> for this
            chat and save cited snippets here. Use{" "}
            <strong className="text-foreground">memory</strong> in the same
            toolbar when you want facts kept across future chats.
          </p>
        </div>

        <details className="rounded-lg border border-border/80 bg-background/40 text-sm">
          <summary className="cursor-pointer select-none px-3 py-2 font-medium text-foreground">
            Standalone research (optional)
          </summary>
          <div className="border-t border-border/60 px-3 py-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Run the research agent without a chat message (same quota as chat
              research).
            </p>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="research-topic"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Topic
              </label>
              <textarea
                id="research-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="e.g. Recent work on retrieval-augmented generation"
                className="min-h-[88px] resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Research topic"
                disabled={busy}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleRun()}
                  disabled={busy || !topic.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {busy ? "Researching…" : "Run research"}
                </button>
                <span className="text-xs text-muted-foreground">
                  Ctrl+Enter to run
                </span>
              </div>
            </div>
          </div>
        </details>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        {lastSummary ? (
          <section
            className="rounded-lg border border-border bg-card p-3 text-sm text-card-foreground"
            aria-label="Latest synthesis"
          >
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Latest synthesis
            </h2>
            <div className="whitespace-pre-wrap">{lastSummary}</div>
          </section>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Saved snippets ({snippets.length})
          </h2>
          {snippets.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>

        {snippets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No snippets yet. Enable research in chat and ask a question, or use
            standalone research above. Snippets feed chat RAG with notes and
            memory when Research in RAG is on.
          </p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Research snippets">
            {[...snippets]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                          {s.sourceType}
                        </span>{" "}
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="break-all text-primary underline-offset-2 hover:underline"
                        >
                          {s.sourceUrl}
                        </a>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSnippet(s.id)}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                      aria-label={`Remove snippet ${s.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-card-foreground/90">
                    {s.body.length > 1200 ? `${s.body.slice(0, 1200)}…` : s.body}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};
