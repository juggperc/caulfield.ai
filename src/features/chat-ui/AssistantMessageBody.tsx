"use client";

import { isFileSpecOutput } from "@/features/documents/file-spec";
import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { motion } from "framer-motion";
import { memo } from "react";
import { GeneratedFileDownload } from "./GeneratedFileDownload";
import { MarkdownMessage } from "./MarkdownMessage";
import { ToolErrorCallout } from "./ToolErrorCallout";
import {
  WebSearchSources,
  type SearchSource,
} from "./WebSearchSources";

type AssistantMessageBodyProps = {
  readonly message: UIMessage;
};

const WEB_SEARCH_TOOLS = new Set(["native_web_lookup", "exa_search"]);

const toolTypeLabel = (partType: string) =>
  partType.startsWith("tool-") ? partType.slice(5) : partType;

const isSearchToolPart = (part: Record<string, unknown>): boolean => {
  const name = "toolName" in part && typeof part.toolName === "string" ? part.toolName : "";
  return WEB_SEARCH_TOOLS.has(name);
};

const extractSources = (output: unknown): { query: string; sources: SearchSource[] } | null => {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const query = typeof o.query === "string" ? o.query : "";
  const rawSources = Array.isArray(o.sources) ? o.sources : [];
  if (rawSources.length === 0) return null;
  const sources: SearchSource[] = rawSources
    .filter(
      (s): s is { title: string; url: string; snippet: string } =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Record<string, unknown>).title === "string" &&
        typeof (s as Record<string, unknown>).url === "string" &&
        typeof (s as Record<string, unknown>).snippet === "string",
    )
    .slice(0, 10);
  return sources.length > 0 ? { query, sources } : null;
};

const SearchingIndicator = () => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <motion.span
      className="inline-flex gap-0.5"
      aria-label="Searching the web"
    >
      Searching the web
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        >
          .
        </motion.span>
      ))}
    </motion.span>
  </div>
);

export const AssistantMessageBody = memo(
  ({ message }: AssistantMessageBodyProps) => {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        {message.parts.map((part, idx) => {
          if (part.type === "text") {
            if (part.text === undefined || part.text === "") return null;
            return <MarkdownMessage key={`txt-${idx}`} content={part.text} />;
          }

          if (isToolUIPart(part)) {
            const label = toolTypeLabel(part.type);

            if (
              part.state === "output-available" &&
              isFileSpecOutput(part.output)
            ) {
              return (
                <GeneratedFileDownload
                  key={`file-${part.toolCallId ?? idx}`}
                  payload={part.output}
                  libraryDedupeKey={part.toolCallId}
                />
              );
            }

            if (part.state === "output-available" && isSearchToolPart(part)) {
              const parsed = extractSources(part.output);
              if (parsed) {
                return (
                  <WebSearchSources
                    key={`src-${part.toolCallId ?? idx}`}
                    query={parsed.query}
                    sources={parsed.sources}
                  />
                );
              }
            }

            if (part.state === "output-error") {
              return (
                <ToolErrorCallout
                  key={`err-${part.toolCallId ?? idx}`}
                  toolLabel={label}
                  errorText={part.errorText}
                />
              );
            }

            if (
              part.state === "input-streaming" ||
              part.state === "input-available"
            ) {
              if (isSearchToolPart(part)) {
                return <SearchingIndicator key={`pend-${part.toolCallId ?? idx}`} />;
              }
              return (
                <p
                  key={`pend-${part.toolCallId ?? idx}`}
                  className="text-xs text-muted-foreground"
                >
                  {label}…
                </p>
              );
            }
          }

          return null;
        })}
      </div>
    );
  },
);
AssistantMessageBody.displayName = "AssistantMessageBody";
