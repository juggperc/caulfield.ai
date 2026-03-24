import type { AppPanel } from "@/features/shell/panel";

export const WORKSPACE_PANEL_EVENT = "caulfield:workspace-panel";
export const SYNC_WEB_SEARCH_EVENT = "caulfield:sync-web-search";

export type WorkspacePanelEventDetail = {
  readonly panel: AppPanel;
};

export type SyncWebSearchEventDetail = {
  readonly enabled: boolean;
};

export const dispatchWorkspacePanel = (panel: AppPanel): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WorkspacePanelEventDetail>(WORKSPACE_PANEL_EVENT, {
      detail: { panel },
    }),
  );
};

export const dispatchSyncWebSearch = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SyncWebSearchEventDetail>(SYNC_WEB_SEARCH_EVENT, {
      detail: { enabled },
    }),
  );
};

const PANELS: ReadonlySet<string> = new Set([
  "chat",
  "notes",
  "docs",
  "library",
  "settings",
]);

export const isAppPanel = (v: unknown): v is AppPanel =>
  typeof v === "string" && PANELS.has(v);
