"use client";

import type { UIMessage } from "ai";

type UserMessageBodyProps = {
  readonly message: UIMessage;
};

export const UserMessageBody = ({ message }: UserMessageBodyProps) => {
  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          const t = part.text?.trim() ?? "";
          if (!t) return null;
          return (
            <span key={`t-${i}`} className="whitespace-pre-wrap">
              {part.text}
            </span>
          );
        }
        if (part.type === "file") {
          if (part.mediaType.startsWith("image/")) {
            return (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URLs / blob URLs
              <img
                key={`f-${i}`}
                src={part.url}
                alt={part.filename ? `Attached: ${part.filename}` : "Attached image"}
                className="max-h-52 max-w-full rounded-lg border border-border/60 object-contain"
                loading="lazy"
              />
            );
          }
          return (
            <span
              key={`f-${i}`}
              className="text-xs text-muted-foreground"
            >
              {part.filename ?? "Attachment"} ({part.mediaType})
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};
