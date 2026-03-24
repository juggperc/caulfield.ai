"use client";

import { Button } from "@/components/ui/button";
import { getLibraryBlob } from "@/features/library/library-store";
import { WorkspacePanelHeader } from "@/features/shell/WorkspacePanelHeader";
import { FileUp } from "lucide-react";
import { useRef } from "react";
import { useLibrary } from "./library-context";
import { LibraryItemCard } from "./LibraryItemCard";

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
    <div className="flex min-h-0 flex-1 flex-col bg-muted">
      <WorkspacePanelHeader title="Library">
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
      </WorkspacePanelHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 md:p-5">
        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Loading library…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Generated files from chat are saved automatically;
            use Upload to add your own.
          </p>
        ) : (
          <ul
            className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]"
            aria-label="Library items"
          >
            {items.map((item) => (
              <LibraryItemCard
                key={item.id}
                item={item}
                formatRelative={formatRelative}
                onDownload={handleDownload}
                onRemove={removeItem}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
