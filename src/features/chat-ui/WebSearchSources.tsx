"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Globe } from "lucide-react";
import { memo, useState } from "react";

export type SearchSource = {
  title: string;
  url: string;
  snippet: string;
};

type WebSearchSourcesProps = {
  readonly query: string;
  readonly sources: SearchSource[];
};

const faviconUrl = (pageUrl: string): string => {
  try {
    const { hostname } = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
  } catch {
    return "";
  }
};

const SourceRow = memo(
  ({ source, index }: { readonly source: SearchSource; readonly index: number }) => {
    const favicon = faviconUrl(source.url);
    return (
      <motion.a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.2 }}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={favicon}
                alt=""
                width={14}
                height={14}
                className="size-3.5 shrink-0 rounded-sm"
                loading="lazy"
              />
            ) : null}
            <span className="truncate text-[13px] font-medium text-foreground group-hover:underline">
              {source.title}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {source.snippet}
          </p>
        </div>
      </motion.a>
    );
  },
);
SourceRow.displayName = "SourceRow";

export const WebSearchSources = memo(
  ({ query, sources }: WebSearchSourcesProps) => {
    const [expanded, setExpanded] = useState(false);

    if (sources.length === 0) return null;

    const preview = sources.slice(0, 3);
    const rest = sources.slice(3);

    return (
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse sources" : "Expand sources"}
        >
          <Globe className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            Searched: {query}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {sources.length} source{sources.length !== 1 ? "s" : ""}
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          </motion.span>
        </button>

        <div className="flex flex-wrap gap-1.5 border-t border-border/50 px-3 py-2">
          {preview.map((s, i) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
              title={s.title}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="max-w-[120px] truncate">{s.title}</span>
            </a>
          ))}
          {rest.length > 0 && !expanded ? (
            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
              +{rest.length} more
            </span>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-0.5 border-t border-border/50 px-1 py-1.5">
                {sources.map((s, i) => (
                  <SourceRow key={s.url} source={s} index={i} />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  },
);
WebSearchSources.displayName = "WebSearchSources";
