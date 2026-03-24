import type { StoredChatMode } from "@/features/ai-agent/storage";

/** Mutable builder for `PlaybookApply` (readonly on stored entries). */
export type PlaybookApplyDraft = {
  chatMode?: StoredChatMode;
  webSearch?: boolean;
  ragMemory?: boolean;
  ragResearch?: boolean;
};

/** Optional workspace prefs applied before the drafted prompt is sent. */
export type PlaybookApply = Readonly<PlaybookApplyDraft>;

export type PlaybookEntry = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** Draft user message inserted into the chat composer. */
  readonly prompt: string;
  readonly apply?: PlaybookApply;
  readonly builtIn?: boolean;
};
