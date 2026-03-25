"use client";

import type { ImageSpecPayload } from "@/features/images/image-payload";
import { cn } from "@/lib/utils";
import { Download, ExternalLink, ImageIcon } from "lucide-react";
import { memo, useCallback, useState } from "react";

type GeneratedImageProps = {
  readonly payload: ImageSpecPayload;
  readonly libraryDedupeKey?: string;
};

export const GeneratedImage = memo(
  ({ payload }: GeneratedImageProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = useCallback(async () => {
      setLoading(true);
      setError(null);
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
        setError(e instanceof Error ? e.message : "Download failed");
      } finally {
        setLoading(false);
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="size-4" aria-hidden />
          <span className="font-medium">{payload.filename}</span>
          {payload.summary && (
            <span className="text-muted-foreground">— {payload.summary}</span>
          )}
        </div>

        <div className="relative overflow-hidden rounded-md border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={payload.prompt}
            className="max-h-[512px] w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <Download className="size-3.5" aria-hidden />
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

        {error && <div className="text-xs text-destructive">{error}</div>}
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
