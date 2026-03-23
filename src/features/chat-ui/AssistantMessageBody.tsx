"use client";

import { isFileSpecOutput } from "@/features/documents/file-spec";
import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { GeneratedFileDownload } from "./GeneratedFileDownload";
import { MarkdownMessage } from "./MarkdownMessage";
import { ToolErrorCallout } from "./ToolErrorCallout";

type AssistantMessageBodyProps = {
  readonly message: UIMessage;
};

const toolTypeLabel = (partType: string) =>
  partType.startsWith("tool-") ? partType.slice(5) : partType;

export const AssistantMessageBody = ({ message }: AssistantMessageBodyProps) => {
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
};
