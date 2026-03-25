import type { AppPanel } from "@/features/shell/panel";
import {
  buildQuotedChatMessage,
  setPendingChatInput,
  setPendingDocsAssistantInput,
} from "./ai-pending-prompts";

export type AiContextAction = {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly cone?: boolean;
  readonly separator?: boolean;
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

  if (hasSel) {
    actions.push({
      id: "copy",
      label: "Copy",
      icon: "copy",
      run: () => {
        navigator.clipboard.writeText(sel);
        closeMenu();
      },
    });
  }

  actions.push({
    id: "ask-chat",
    label: "Ask in Chat…",
    icon: "message",
    run: () => {
      goChat("", { focus: true });
    },
  });

  if (hasSel) {
    actions.push({ id: "sep-1", label: "", separator: true, run: () => {} });

    actions.push(
      {
        id: "summarize",
        label: "Summarize",
        icon: "list",
        cone: true,
        run: () => {
          goChat(`Summarize the following in a few concise bullets:\n\n${quoteBlock(sel)}`);
        },
      },
      {
        id: "rewrite",
        label: "Rewrite",
        icon: "pencil",
        cone: true,
        run: () => {
          goChat(`Rewrite the following more clearly and directly:\n\n${quoteBlock(sel)}`);
        },
      },
      {
        id: "tone",
        label: "Fix tone",
        icon: "sparkles",
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
        icon: "lightbulb",
        cone: true,
        run: () => {
          goChat(`Explain the following in plain language:\n\n${quoteBlock(sel)}`);
        },
      },
    );

    actions.push({ id: "sep-2", label: "", separator: true, run: () => {} });

    actions.push(
      {
        id: "translate",
        label: "Translate…",
        icon: "languages",
        run: () => {
          goChat(`Translate the following to English (or the most appropriate language if already in English, explain what language it is):\n\n${quoteBlock(sel)}`);
        },
      },
      {
        id: "search-web",
        label: "Search web",
        icon: "globe",
        run: () => {
          goChat(`Search the web for information about: "${sel.slice(0, 200)}"`);
        },
      },
    );

    if (panel === "notes" || panel === "docs") {
      actions.push({
        id: "continue",
        label: "Continue from selection",
        icon: "arrow-right",
        run: () => {
          goChat(`Continue naturally from this text:\n\n${quoteBlock(sel)}`);
        },
      });
    }

    if (panel === "chat") {
      actions.push({
        id: "quote",
        label: "Quote in message",
        icon: "quote",
        run: () => {
          goChat(buildQuotedChatMessage(sel));
        },
      });
    }

    if (panel === "docs") {
      actions.push({
        id: "docs-edit-selection",
        label: "Instruct Doc assistant…",
        icon: "file-edit",
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
      icon: "file-text",
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
