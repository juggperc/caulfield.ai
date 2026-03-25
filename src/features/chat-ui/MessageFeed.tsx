"use client";

import type { UIMessage } from "ai";
import { memo, useEffect, useRef, useState } from "react";
import { AssistantMessageBody } from "./AssistantMessageBody";
import { UserMessageBody } from "./UserMessageBody";

type MessageFeedProps = {
  readonly messages: UIMessage[];
  readonly status: "submitted" | "streaming" | "ready" | "error";
  readonly error: Error | undefined;
};

const parseApiError = (
  error: Error,
): { type: "quota" | "auth" | "generic"; message: string } => {
  const msg = error.message ?? "";
  if (msg.includes("QUOTA_EXCEEDED") || msg.includes("Free queries used") || msg.includes("Monthly query limit")) {
    return { type: "quota", message: msg };
  }
  if (msg.includes("UNAUTHORIZED") || msg.includes("Sign in")) {
    return { type: "auth", message: msg };
  }
  return { type: "generic", message: msg };
};

type MessageRowProps = {
  readonly message: UIMessage;
};

const MessageRow = memo(({ message }: MessageRowProps) => {
  const isUser = message.role === "user";
  return (
    <div
      className={[
        isUser ? "flex justify-end" : "flex justify-start",
        "animate-in fade-in duration-200",
      ].join(" ")}
      style={{ overflowAnchor: "none" }}
    >
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl border border-border bg-muted px-4 py-2.5 text-[0.9375rem] leading-relaxed text-foreground shadow-sm dark:border-border/80 dark:bg-accent/20 dark:shadow-none"
            : "max-w-full min-w-0 text-[0.9375rem] leading-relaxed"
        }
      >
        {isUser ? (
          <UserMessageBody message={message} />
        ) : (
          <AssistantMessageBody message={message} />
        )}
      </div>
    </div>
  );
});
MessageRow.displayName = "MessageRow";

export const MessageFeed = ({ messages, status, error }: MessageFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const rafRef = useRef<number | null>(null);
  const isStreamingRef = useRef(false);

  isStreamingRef.current = status === "streaming" || status === "submitted";

  const isNearBottom = (): boolean => {
    const el = scrollRef.current;
    if (!el) return true;
    const threshold = 100;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = isNearBottom();
      setUserScrolledUp(!nearBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (userScrolledUp && !isStreamingRef.current) {
      return;
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [messages, userScrolledUp]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 max-md:pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] md:px-4"
      style={{ 
        overscrollBehavior: "contain",
      }}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Start a conversation.</p>
        ) : null}

        {messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))}

        {error ? (
          <ErrorBanner error={error} />
        ) : null}
      </div>
    </div>
  );
};

const ErrorBanner = ({ error }: { error: Error }) => {
  const parsed = parseApiError(error);

  if (parsed.type === "quota") {
    return (
      <div
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        role="alert"
      >
        <p className="text-sm font-medium text-destructive">Query limit reached</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {parsed.message.includes("Free queries")
            ? "You\u2019ve used all free queries. Subscribe to continue using Caulfield.ai."
            : "You\u2019ve reached your monthly query limit. Your quota will reset at the start of your next billing period."}
        </p>
        {parsed.message.includes("Free queries") ? (
          <a
            href="/api/billing/checkout"
            className="mt-3 inline-flex items-center rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Subscribe — $20/mo
          </a>
        ) : null}
      </div>
    );
  }

  if (parsed.type === "auth") {
    return (
      <div
        className="rounded-lg border border-border bg-muted/50 p-4"
        role="alert"
      >
        <p className="text-sm font-medium text-foreground">Sign in required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You need to sign in to use hosted AI features. Use the sidebar to sign in with your account.
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {parsed.message}
    </p>
  );
};
