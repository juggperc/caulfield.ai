"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { memo, useMemo } from "react";
import { CodeBlock } from "./CodeBlock";

type MarkdownMessageProps = {
  readonly content: string;
};

const useMarkdownComponents = (): Components =>
  useMemo(
    () => ({
      p: ({ children }) => (
        <p className="mb-3 text-[0.9375rem] leading-relaxed text-foreground last:mb-0">
          {children}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-[0.9375rem] leading-relaxed">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-[0.9375rem] leading-relaxed">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="leading-relaxed text-foreground">{children}</li>
      ),
      h1: ({ children }) => (
        <h1 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground first:mt-0">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-2 mt-5 text-lg font-semibold tracking-tight text-foreground first:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-2 mt-4 text-base font-semibold tracking-tight text-foreground first:mt-0">
          {children}
        </h3>
      ),
      a: ({ children, href }) => (
        <a
          href={href}
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }) => (
        <blockquote className="mb-3 border-l-2 border-primary/35 pl-4 text-muted-foreground dark:border-primary/45">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-6 border-border" />,
      code: ({ className, children, ...props }) => {
        const code = String(children).replace(/\n$/, "");
        const match = /language-([\w-]+)/.exec(className ?? "");
        const isBlock = Boolean(match) || code.includes("\n");

        if (!isBlock) {
          return (
            <code
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground"
              {...props}
            >
              {children}
            </code>
          );
        }

        return <CodeBlock code={code} language={match?.[1] ?? "text"} />;
      },
      pre: ({ children }) => <>{children}</>,
    }),
    [],
  );

export const MarkdownMessage = memo(({ content }: MarkdownMessageProps) => {
  const components = useMarkdownComponents();

  return (
    <div className="min-w-0 text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
MarkdownMessage.displayName = "MarkdownMessage";
