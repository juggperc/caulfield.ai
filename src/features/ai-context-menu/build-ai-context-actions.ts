import type { AppPanel } from "@/features/shell/panel";
import {
  buildQuotedChatMessage,
  setPendingChatInput,
  setPendingDocsAssistantInput,
} from "./ai-pending-prompts";

export type AiContextAction = {
  readonly id: string;
  readonly label: string;
  readonly cone?: boolean;
  readonly run: () => void;
};

type BuildActionsParams = {
  readonly panel: AppPanel;
  readonly selectionText: string;
  readonly onPanelChange: (p: AppPanel) => void;
  readonly closeMenu: () => void;
};

const quoteBlock = (t: string) => {
  const s = t.trim();
  if (!s) return "";
  return `"""${s}"""`;
};

export const buildAiContextActions = ({
  panel,
  selectionText,
  onPanelChange,
  closeMenu,
}: BuildActionsParams): AiContextAction[] => {
  const sel = selectionText.trim();
  const hasSel = sel.length > 0;

  const goChat = (text: string, options?: { readonly focus?: boolean }) => {
    setPendingChatInput(text, { focus: options?.focus !== false });
    onPanelChange("chat");
    closeMenu();
  };

  const goDocsAssist = (instruction: string) => {
    setPendingDocsAssistantInput(instruction);
    onPanelChange("docs");
    closeMenu();
  };

  const actions: AiContextAction[] = [];

  actions.push({
    id: "ask-chat",
    label: "Ask in Chat…",
    run: () => {
      goChat("", { focus: true });
    },
  });

  if (hasSel) {
    actions.push(
      {
        id: "summarize",
        label: "Summarize",
        cone: true,
        run: () => {
          goChat(`Summarize the following in a few concise bullets:\n\n${quoteBlock(sel)}`);
        },
      },
      {
        id: "rewrite",
        label: "Rewrite",
        cone: true,
        run: () => {
          goChat(`Rewrite the following more clearly and directly:\n\n${quoteBlock(sel)}`);
        },
      },
      {
        id: "tone",
        label: "Fix tone",
        cone: true,
        run: () => {
          goChat(
            `Improve the tone (clear, professional) while preserving meaning:\n\n${quoteBlock(sel)}`,
          );
        },
      },
      {
        id: "explain",
        label: "Explain",
        cone: true,
        run: () => {
          goChat(`Explain the following in plain language:\n\n${quoteBlock(sel)}`);
        },
      },
    );

    if (
      panel === "notes" ||
      panel === "docs" ||
      panel === "research" ||
      panel === "memory"
    ) {
      actions.push({
        id: "continue",
        label: "Continue from selection",
        run: () => {
          goChat(`Continue naturally from this text:\n\n${quoteBlock(sel)}`);
        },
      });
    }

    if (panel === "chat") {
      actions.push({
        id: "quote",
        label: "Quote in message",
        run: () => {
          goChat(buildQuotedChatMessage(sel));
        },
      });
    }

    if (panel === "docs") {
      actions.push({
        id: "docs-edit-selection",
        label: "Instruct Doc assistant…",
        run: () => {
          goDocsAssist(
            `Improve the following part of the document (use docs_apply_edits when appropriate). Selection context:\n\n${quoteBlock(sel)}`,
          );
        },
      });
    }
  } else if (panel === "docs") {
    actions.push({
      id: "docs-open-assist",
      label: "Open Doc assistant",
      run: () => {
        goDocsAssist(
          "Help me improve the open document. Suggest concrete edits using docs_apply_edits.",
        );
      },
    });
  }

  return actions;
};

export const coneActionsFrom = (actions: AiContextAction[]) =>
  actions.filter((a) => a.cone);
