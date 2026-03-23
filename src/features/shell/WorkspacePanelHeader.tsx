import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type WorkspacePanelHeaderProps = {
  readonly title: string;
  readonly className?: string;
  readonly children?: ReactNode;
};

/**
 * Matches Notes / Docs list chrome: compact title bar on `bg-muted` shells.
 */
export const WorkspacePanelHeader = ({
  title,
  className,
  children,
}: WorkspacePanelHeaderProps) => (
  <div
    className={cn(
      "flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5",
      className,
    )}
  >
    <span className="text-[13px] font-semibold tracking-tight text-foreground">
      {title}
    </span>
    {children ? (
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    ) : null}
  </div>
);
