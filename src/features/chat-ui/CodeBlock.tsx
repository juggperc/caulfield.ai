"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeBlockProps = {
  readonly code: string;
  readonly language: string;
};

export const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const highlighterStyle = isLight ? oneLight : oneDark;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const label = language.trim() || "text";

  return (
    <div
      className={cn(
        "my-4 overflow-hidden rounded-lg border font-mono text-sm shadow-sm",
        isLight
          ? "border-border bg-zinc-50"
          : "border-zinc-700/90 bg-zinc-950 dark:border-zinc-600/70",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-3 py-2",
          isLight ? "border-border bg-zinc-100/90" : "border-white/10 bg-black/20",
        )}
      >
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-widest",
            isLight ? "text-muted-foreground" : "text-zinc-400",
          )}
        >
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={cn(
            "h-7",
            isLight
              ? "text-muted-foreground hover:bg-black/[0.06] hover:text-foreground"
              : "text-zinc-400 hover:bg-white/10 hover:text-zinc-100",
          )}
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={label === "text" ? "text" : label}
        style={highlighterStyle}
        customStyle={{
          margin: 0,
          padding: "1rem 1rem 1.125rem",
          background: "transparent",
          fontSize: "0.8125rem",
          lineHeight: 1.6,
        }}
        codeTagProps={{
          className: "font-mono",
        }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
