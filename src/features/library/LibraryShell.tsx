"use client";

import { Button } from "@/components/ui/button";
import { getLibraryBlob } from "@/features/library/library-store";
import { Download, FileUp, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useLibrary } from "./library-context";

const formatRelative = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const LibraryShell = () => {
  const { items, hydrated, addUpload, removeItem } = useLibrary();
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePickFiles = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    void (async () => {
      for (const f of Array.from(list)) {
        await addUpload(f);
      }
      e.target.value = "";
    })();
  };

  const handleDownload = (id: string, filename: string) => {
    void (async () => {
      const blob = await getLibraryBlob(id);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    })();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 justify-end border-b border-border px-3 py-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handlePickFiles}
          aria-label="Upload files to library"
        >
          <FileUp className="size-3.5 opacity-70" aria-hidden />
          Upload
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Loading library…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Generated files from chat are saved automatically;
            use Upload to add your own.
          </p>
        ) : (
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3"
            aria-label="Library items"
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.filename}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-px capitalize">
                      {item.source === "workspace"
                        ? "Workspace"
                        : item.source}
                    </span>
                    <span className="mx-1.5">·</span>
                    {formatRelative(item.updatedAt)}
                  </p>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(item.id, item.filename)}
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
                    onClick={() => void removeItem(item.id)}
                    aria-label={`Remove ${item.filename} from library`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
