import { setPendingChatInput } from "@/features/ai-context-menu/ai-pending-prompts";
import {
  setWebSearchOverride,
  writeChatMode,
  writeChatRagMemoryEnabled,
  writeChatRagResearchEnabled,
} from "@/features/ai-agent/storage";
import {
  dispatchSyncWebSearch,
  dispatchWorkspacePanel,
} from "./playbook-events";
import type { PlaybookEntry } from "./types";

export type ApplyPlaybookDeps = {
  readonly onWorkspaceUpdated: () => void;
};

/**
 * Applies optional workspace prefs, opens Chat, stages the prompt in the composer, and refreshes palette/chip state.
 */
export const applyPlaybook = (
  entry: PlaybookEntry,
  deps: ApplyPlaybookDeps,
): void => {
  const apply = entry.apply;
  if (apply?.chatMode) {
    writeChatMode(apply.chatMode);
  }
  if (apply?.ragMemory !== undefined) {
    writeChatRagMemoryEnabled(apply.ragMemory);
  }
  if (apply?.ragResearch !== undefined) {
    writeChatRagResearchEnabled(apply.ragResearch);
  }
  if (apply?.webSearch !== undefined) {
    setWebSearchOverride(apply.webSearch);
    dispatchSyncWebSearch(apply.webSearch);
  }

  dispatchWorkspacePanel("chat");
  setPendingChatInput(entry.prompt, { focus: true });
  deps.onWorkspaceUpdated();
};
