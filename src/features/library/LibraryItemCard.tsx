"use client";

import { Button } from "@/components/ui/button";
import { getLibraryBlob } from "@/features/library/library-store";
import type { LibraryItemMeta } from "@/features/library/types";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, FileText, FileType2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type PreviewState =
  | { kind: "loading" }
  | { kind: "image"; url: string }
  | { kind: "text"; snippet: string }
  | { kind: "icon"; icon: "doc" | "sheet" | "generic" };

const TEXT_PREVIEW_BYTES = 800;

const PREVIEW_FALLBACK_ICON_CLASS = "size-12 text-muted-foreground/80";

const LibraryPreviewFallbackIcon = ({
  k,
}: {
  k: "doc" | "sheet" | "generic";
}) => {
  if (k === "sheet") {
    return (
      <FileSpreadsheet className={PREVIEW_FALLBACK_ICON_CLASS} aria-hidden />
    );
  }
  if (k === "doc") {
    return <FileText className={PREVIEW_FALLBACK_ICON_CLASS} aria-hidden />;
  }
  return <FileType2 className={PREVIEW_FALLBACK_ICON_CLASS} aria-hidden />;
};

const pickIconKind = (mime: string): "doc" | "sheet" | "generic" => {
  const m = mime.toLowerCase();
  if (
    m.includes("spreadsheet") ||
    m.includes("csv") ||
    m === "application/vnd.ms-excel" ||
    m.includes("sheet")
  ) {
    return "sheet";
  }
  if (m === "application/pdf" || m.includes("word") || m.includes("document")) {
    return "doc";
  }
  return "generic";
};

type LibraryItemCardProps = {
  readonly item: LibraryItemMeta;
  readonly formatRelative: (ts: number) => string;
  readonly onDownload: (id: string, filename: string) => void;
  readonly onRemove: (id: string) => void;
};

export const LibraryItemCard = ({
  item,
  formatRelative,
  onDownload,
  onRemove,
}: LibraryItemCardProps) => {
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const run = async () => {
      const blob = await getLibraryBlob(item.id);
      if (cancelled) return;
      if (!blob || blob.size === 0) {
        setPreview({ kind: "icon", icon: pickIconKind(item.mimeType) });
        return;
      }
      const mime = (blob.type || item.mimeType).toLowerCase();
      if (mime.startsWith("image/")) {
        objectUrl = URL.createObjectURL(blob);
        setPreview({ kind: "image", url: objectUrl });
        return;
      }
      if (mime.startsWith("text/") || mime === "application/json") {
        try {
          const slice = blob.slice(0, TEXT_PREVIEW_BYTES);
          const text = await slice.text();
          const snippet =
            mime === "application/json"
              ? (() => {
                  try {
                    const parsed = JSON.parse(text) as unknown;
                    const s = JSON.stringify(parsed, null, 0);
                    return s.length > 280 ? `${s.slice(0, 280)}…` : s;
                  } catch {
                    return text.replace(/\s+/g, " ").trim().slice(0, 280);
                  }
                })()
              : text.replace(/\s+/g, " ").trim().slice(0, 320);
          setPreview({
            kind: "text",
            snippet: snippet || "Empty file",
          });
        } catch {
          setPreview({ kind: "icon", icon: pickIconKind(item.mimeType) });
        }
        return;
      }
      setPreview({ kind: "icon", icon: pickIconKind(item.mimeType) });
    };

    void run();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.mimeType]);

  return (
    <li
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-shadow",
        "hover:border-border hover:shadow-md",
        "bg-gradient-to-b from-card to-card/95",
      )}
    >
      <div
        className={cn(
          "relative aspect-[4/3] w-full overflow-hidden border-b border-border/60 bg-muted/40",
        )}
      >
        {preview.kind === "loading" ? (
          <div className="absolute inset-0 animate-pulse bg-muted/60" aria-hidden />
        ) : null}
        {preview.kind === "image" ? (
          // Blob URLs are not compatible with next/image without a custom loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
        {preview.kind === "text" ? (
          <pre
            className="max-h-full overflow-hidden p-3 text-left font-mono text-[10px] leading-relaxed text-muted-foreground"
            tabIndex={0}
          >
            {preview.snippet}
          </pre>
        ) : null}
        {preview.kind === "icon" ? (
          <div className="flex size-full items-center justify-center bg-muted/30">
            <LibraryPreviewFallbackIcon k={preview.icon} />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground" title={item.filename}>
            {item.filename}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="rounded-md bg-muted/80 px-1.5 py-px capitalize">
              {item.source === "workspace" ? "Workspace" : item.source}
            </span>
            <span className="mx-1.5 opacity-50">·</span>
            {formatRelative(item.updatedAt)}
          </p>
        </div>
        <div className="mt-auto flex gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDownload(item.id, item.filename)}
            aria-label={`Download ${item.filename}`}
          >
            <Download className="mr-1 size-3.5 opacity-70" aria-hidden />
            Download
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => void onRemove(item.id)}
            aria-label={`Remove ${item.filename} from library`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
};
