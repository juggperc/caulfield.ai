"use client";

import type { UIMessage } from "ai";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { AssistantMessageBody } from "./AssistantMessageBody";
import { getMessageText } from "./message-utils";

type MessageFeedProps = {
  readonly messages: UIMessage[];
  readonly status: "submitted" | "streaming" | "ready" | "error";
  readonly error: Error | undefined;
};

export const MessageFeed = ({ messages, status, error }: MessageFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const runScroll = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: status === "streaming" || status === "submitted" ? "smooth" : "auto",
        });
      });
    };

    runScroll();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [messages, status]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Start a conversation.</p>
        ) : null}

        {messages.map((message) => {
          const text = getMessageText(message);
          const isUser = message.role === "user";

          return (
            <motion.div
              key={message.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={
                isUser
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl border border-border bg-muted px-4 py-2.5 text-[0.9375rem] leading-relaxed text-foreground shadow-sm dark:border-border/80 dark:bg-accent/20 dark:shadow-none"
                    : "max-w-full min-w-0 text-[0.9375rem] leading-relaxed"
                }
              >
                {isUser ? (
                  <span className="whitespace-pre-wrap">{text}</span>
                ) : (
                  <AssistantMessageBody message={message} />
                )}
              </div>
            </motion.div>
          );
        })}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </div>
    </div>
  );
};
