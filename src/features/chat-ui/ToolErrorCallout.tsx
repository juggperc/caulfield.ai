"use client";

type ToolErrorCalloutProps = {
  readonly toolLabel: string;
  readonly errorText: string;
};

const isDocsApplyEditsTool = (label: string, errorText: string) =>
  label === "docs_apply_edits" ||
  errorText.includes("docs_apply_edits") ||
  errorText.includes('"edits"') ||
  errorText.toLowerCase().includes("invalid input for tool");

export const ToolErrorCallout = ({
  toolLabel,
  errorText,
}: ToolErrorCalloutProps) => {
  const docsEdits = isDocsApplyEditsTool(toolLabel, errorText);
  const truncated =
    errorText.length > 1200
      ? `${errorText.slice(0, 1200)}…`
      : errorText;

  return (
    <div
      className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-sm dark:border-destructive/45 dark:bg-destructive/15"
      role="alert"
    >
      <p className="font-medium text-destructive">
        {docsEdits
          ? "Couldn’t apply document edits"
          : `${toolLabel} failed`}
      </p>
      {docsEdits ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">
            edits
          </code>{" "}
          must be a JSON <strong className="font-medium text-foreground">array</strong> of
          edit objects (or one object), or a <strong className="font-medium text-foreground">string</strong>{" "}
          containing that JSON (including double-encoded). Each edit uses{" "}
          <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">
            type
          </code>
          :{" "}
          <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">
            replace_range
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">
            insert_at
          </code>
          , or{" "}
          <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">
            delete_range
          </code>{" "}
          with numeric positions and TipTap{" "}
          <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">
            content
          </code>{" "}
          where required. If validation failed, the JSON may be{" "}
          <strong className="font-medium text-foreground">truncated</strong>—retry with{" "}
          <strong className="font-medium text-foreground">smaller</strong> edits (e.g. a few
          paragraphs per call).
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Try rephrasing or retrying. If this keeps happening, check your model
          settings.
        </p>
      )}
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">
          Technical details
        </summary>
        <pre className="mt-1.5 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/70 bg-muted/40 p-2 font-mono text-[11px] leading-snug text-foreground/90">
          {truncated}
        </pre>
      </details>
    </div>
  );
};
