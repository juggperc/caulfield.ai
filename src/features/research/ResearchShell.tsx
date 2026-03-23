"use client";

import { useResearch } from "@/features/research/research-provider";
import type { ResearchSnippet } from "@/features/research/research-types";
import {
  readOpenRouterKey,
  readOpenRouterModel,
} from "@/features/ai-agent/storage";
import { ModelChipButton } from "@/features/chat-ui/ModelChipButton";
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
  const [hostedOpenRouter, setHostedOpenRouter] = useState(false);

  useEffect(() => {
    void fetch("/api/config", { credentials: "include" })
      .then((r) => r.json() as Promise<{ hostedOpenRouter?: boolean }>)
      .then((c) => setHostedOpenRouter(Boolean(c.hostedOpenRouter)))
      .catch(() => setHostedOpenRouter(false));
  }, []);

  const handleRun = useCallback(async () => {
    const t = topic.trim();
    if (!t || busy) return;
    const key = readOpenRouterKey().trim();
    const model = readOpenRouterModel().trim();
    if (!model) {
      setError("Choose a chat model (⌘K or settings) first.");
      return;
    }
    if (!hostedOpenRouter && !key) {
      setError("Add your OpenRouter API key in settings first.");
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
          ...(key ? { "x-openrouter-key": key } : {}),
          "x-openrouter-model": model,
        },
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
  }, [topic, busy, addSnippets, hostedOpenRouter]);

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
      {embedded ? null : <WorkspacePanelHeader title="Deep Research" />}

      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-5",
          embedded
            ? "min-h-0"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        )}
      >
        <p className="text-sm text-muted-foreground">
          Multi-step agent loop with Wikipedia, arXiv, and chunked web fetch.
          Saved snippets feed chat RAG alongside Notes and Memory.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Model
          </span>
          <ModelChipButton disabled={busy} />
        </div>
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
            placeholder="e.g. Differentiable rendering for neural fields — recent methods and limitations"
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
            No snippets yet. Run a topic to populate this list; they feed chat
            RAG alongside Notes and Memory.
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
