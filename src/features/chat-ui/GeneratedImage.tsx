"use client";

import type { ImageSpecPayload } from "@/features/images/image-payload";
import { useLibrary } from "@/features/library/library-context";
import { cn } from "@/lib/utils";
import { Check, Download, ExternalLink, ImageIcon, Loader2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

type GeneratedImageProps = {
  readonly payload: ImageSpecPayload;
  readonly libraryDedupeKey?: string;
};

export const GeneratedImage = memo(
  ({ payload, libraryDedupeKey }: GeneratedImageProps) => {
    const { tryAddGeneratedImage } = useLibrary();
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [savedToLibrary, setSavedToLibrary] = useState(false);

    useEffect(() => {
      if (!libraryDedupeKey || savedToLibrary) return;
      tryAddGeneratedImage(libraryDedupeKey, payload)
        .then(() => setSavedToLibrary(true))
        .catch(() => {});
    }, [libraryDedupeKey, payload, tryAddGeneratedImage, savedToLibrary]);

    const handleDownload = useCallback(async () => {
      setDownloadLoading(true);
      setDownloadError(null);
      try {
        const blob = base64ToBlob(payload.base64, "image/png");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = payload.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        setDownloadError(e instanceof Error ? e.message : "Download failed");
      } finally {
        setDownloadLoading(false);
      }
    }, [payload]);

    const handleOpenInNew = useCallback(() => {
      const blob = base64ToBlob(payload.base64, "image/png");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }, [payload]);

    const dataUrl = `data:image/png;base64,${payload.base64}`;

    return (
      <div className="my-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="size-4" aria-hidden />
            <span className="font-medium">{payload.filename}</span>
            {savedToLibrary && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" aria-hidden />
                saved
              </span>
            )}
          </div>
          {payload.summary && (
            <span className="text-xs text-muted-foreground">{payload.summary}</span>
          )}
        </div>

        <div className="relative overflow-hidden rounded-md border border-border bg-background">
          <img
            src={dataUrl}
            alt={payload.prompt}
            className="max-h-[512px] w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloadLoading}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {downloadLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
            Download
          </button>
          <button
            onClick={handleOpenInNew}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Open
          </button>
        </div>

        {downloadError && <div className="text-xs text-destructive">{downloadError}</div>}
      </div>
    );
  },
);
GeneratedImage.displayName = "GeneratedImage";

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
