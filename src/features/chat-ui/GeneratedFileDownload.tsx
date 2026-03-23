"use client";

import { Button } from "@/components/ui/button";
import { buildBlobFromFileSpec } from "@/features/documents/client/build-file-from-spec";
import type { FileSpecPayload } from "@/features/documents/file-spec";
import { useLibrary } from "@/features/library/library-context";
import { Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type GeneratedFileDownloadProps = {
  readonly payload: FileSpecPayload;
  /** Dedupe key for Library (e.g. toolCallId). */
  readonly libraryDedupeKey?: string;
};

export const GeneratedFileDownload = ({
  payload,
  libraryDedupeKey,
}: GeneratedFileDownloadProps) => {
  const [status, setStatus] = useState<"idle" | "building" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { tryAddGeneratedFromSpec } = useLibrary();
  const libraryAttempted = useRef(false);

  useEffect(() => {
    if (!libraryDedupeKey || libraryAttempted.current) return;
    libraryAttempted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const blob = await buildBlobFromFileSpec(payload);
        if (cancelled) return;
        await tryAddGeneratedFromSpec(libraryDedupeKey, payload, blob);
      } catch {
        /* library ingest is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryDedupeKey, payload, tryAddGeneratedFromSpec]);

  const handleDownload = useCallback(async () => {
    setStatus("building");
    setErrorMessage(null);
    try {
      const blob = await buildBlobFromFileSpec(payload);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.filename;
      anchor.rel = "noopener";
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not build file");
      setStatus("error");
    }
  }, [payload]);

  const formatLabel =
    payload.format === "xlsx"
      ? "Excel"
      : payload.format === "docx"
        ? "Word"
        : payload.format.toUpperCase();

  return (
    <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 dark:bg-muted/35">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {payload.filename}
          </div>
          <div className="text-xs text-muted-foreground">{formatLabel} · built in browser</div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={status === "building"}
          onClick={() => void handleDownload()}
          aria-label={`Download ${payload.filename}`}
        >
          <Download className="mr-1.5 size-3.5 opacity-70" aria-hidden />
          {status === "building" ? "Building…" : "Download"}
        </Button>
      </div>
      {errorMessage ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
