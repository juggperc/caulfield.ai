"use client";

import { isFileSpecOutput } from "@/features/documents/file-spec";
import { isImageSpecOutput } from "@/features/images/image-payload";
import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { memo } from "react";
import { GeneratedFileDownload } from "./GeneratedFileDownload";
import { GeneratedImage } from "./GeneratedImage";
import { ImageGeneratingIndicator, ThinkingIndicator } from "./LoadingIndicators";
import { MarkdownMessage } from "./MarkdownMessage";
import { ToolErrorCallout } from "./ToolErrorCallout";
import {
  WebSearchSources,
  type SearchSource,
} from "./WebSearchSources";

type AssistantMessageBodyProps = {
  readonly message: UIMessage;
  readonly isLastAssistantMessage?: boolean;
  readonly status?: "submitted" | "streaming" | "ready" | "error";
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

const isImageGenTool = (part: Record<string, unknown>): boolean => {
  const name = "toolName" in part && typeof part.toolName === "string" ? part.toolName : "";
  return name === "generate_image";
};

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

            if (
              part.state === "output-available" &&
              isImageSpecOutput(part.output)
            ) {
              return (
                <GeneratedImage
                  key={`img-${part.toolCallId ?? idx}`}
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
              if (isImageGenTool(part)) {
                return (
                  <ImageGeneratingIndicator
                    key={`img-pend-${part.toolCallId ?? idx}`}
                  />
                );
              }
              if (isSearchToolPart(part)) {
                return <ThinkingIndicator key={`pend-${part.toolCallId ?? idx}`} />;
              }
              return <ThinkingIndicator key={`pend-${part.toolCallId ?? idx}`} />;
            }
          }

          return null;
        })}
      </div>
    );
  },
);
AssistantMessageBody.displayName = "AssistantMessageBody";
