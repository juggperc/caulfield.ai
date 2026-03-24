import { createWorkspaceReadToolset } from "@/features/ai-agent/workspace-read-tools";
import { createDocumentCreationToolset } from "@/features/documents/document-creation-tools";
import { createDocsEditorToolset } from "@/features/documents/docs-editor-tools";
import {
  MAX_CELL_LENGTH,
  MAX_PLAIN_TEXT_IN_REQUEST,
  WORKSPACE_CHAT_INDEX_EXCERPT,
  WORKSPACE_SHEET_COLS,
  WORKSPACE_SHEET_ROWS,
} from "@/features/documents/limits";
import { createSheetsToolset } from "@/features/documents/sheets-tools";
import { createContext7Toolset } from "@/features/integrations/context7-tools";
import { createExaSearchToolset } from "@/features/integrations/exa-tools";
import { createGithubToolset } from "@/features/integrations/github-tools";
import { createNativeSearchToolset } from "@/features/integrations/native-search-tools";
import { createMemoryToolset } from "@/features/ai-agent/memory-tools";
import { createNotesToolset } from "@/features/ai-agent/notes-tools";
import type { MemoryEntry } from "@/features/memory/memory-types";
import type { Note } from "@/features/notes/types";
import type { ResearchSnippet } from "@/features/research/research-types";
import { auth } from "@/auth";
import { checkChatQuota, consumeChatQuery } from "@/lib/billing/quota";
import { isDbConfigured } from "@/lib/db";
import {
  getEmbeddingModelId,
  getServerOpenRouterKey,
  isChatBillable,
  parseChatModeHeader,
  resolveChatModelId,
  type ChatMode,
} from "@/lib/openrouter/server-models";
import { buildUnifiedRagContextBlock } from "@/lib/unified-rag-context";
import { getLatestUserTextFromUiMessages } from "@/features/ai-agent/last-user-message";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 120;

/** Guardrail for multimodal / pasted data URLs in message history. */
const MAX_MESSAGES_JSON_CHARS = 12_000_000;

const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const ResearchSnippetSchema = z.object({
  id: z.string(),
  topic: z.string(),
  sourceType: z.enum(["web", "wikipedia", "arxiv"]),
  sourceUrl: z.string(),
  title: z.string(),
  body: z.string().max(52_000),
  createdAt: z.number(),
});

const MemoryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().max(50_000),
  tags: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const WorkspaceDocumentBriefSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.number(),
  revision: z.number().int(),
  plainText: z.string().max(8_600),
});

const WorkspaceSheetBriefSchema = z.object({
  id: z.string(),
  title: z.string(),
  revision: z.number().int(),
  csvPreview: z.string().max(6500),
});

const ActiveSheetPayloadSchema = z.object({
  id: z.string(),
  title: z.string(),
  revision: z.number().int(),
  rows: z
    .array(z.array(z.string().max(MAX_CELL_LENGTH)).max(WORKSPACE_SHEET_COLS))
    .max(64),
});

const ChatBodySchema = z.object({
  messages: z.array(z.unknown()),
  notes: z.array(NoteSchema).optional().default([]),
  researchSnippets: z
    .array(ResearchSnippetSchema)
    .max(120)
    .optional()
    .default([]),
  memory: z.array(MemoryEntrySchema).max(200).optional().default([]),
  mode: z.enum(["chat", "docs"]).optional().default("chat"),
  activeDocument: z
    .object({
      id: z.string(),
      title: z.string(),
      revision: z.number().int(),
      contentJson: z.unknown(),
    })
    .optional(),
  activeSheet: ActiveSheetPayloadSchema.optional(),
  workspaceSheets: z
    .array(WorkspaceSheetBriefSchema)
    .max(80)
    .optional()
    .default([]),
  workspaceDocuments: z
    .array(WorkspaceDocumentBriefSchema)
    .max(60)
    .optional()
    .default([]),
  documentPlainText: z.string().max(MAX_PLAIN_TEXT_IN_REQUEST).optional(),
  docSelection: z
    .object({
      from: z.number().int(),
      to: z.number().int(),
      text: z.string().max(50_000),
    })
    .optional(),
  integrationKeys: z
    .object({
      context7ApiKey: z.string().max(8000).optional(),
      exaApiKey: z.string().max(8000).optional(),
      nativeSearchEnabled: z.boolean().optional(),
      githubEnabled: z.boolean().optional(),
      githubToken: z.string().max(4000).optional(),
    })
    .optional(),
  /** When false, memory is excluded from unified RAG only; full memory is still on the request for tools. */
  ragIncludeMemory: z.boolean().optional().default(true),
  /** When false, research snippets are excluded from unified RAG only. */
  ragIncludeResearch: z.boolean().optional().default(true),
});

const truncate = (s: string, max: number) => {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…(truncated)`;
};

const ragRetrievedHeading = (
  ragIncludeMemory: boolean,
  ragIncludeResearch: boolean,
) => {
  const parts: string[] = ["notes"];
  if (ragIncludeResearch) parts.push("research");
  if (ragIncludeMemory) parts.push("memory");
  return `## Retrieved context (${parts.join(", ")})`;
};

const ragBehaviorClause = (
  ragIncludeMemory: boolean,
  ragIncludeResearch: boolean,
) => {
  const chunks: string[] = ["**notes**"];
  if (ragIncludeResearch) {
    chunks.push("**Deep Research** snippets (from the chat research tool)");
  }
  if (ragIncludeMemory) chunks.push("**memory**");
  const list =
    chunks.length === 1
      ? chunks[0]!
      : chunks.length === 2
        ? `${chunks[0]} and ${chunks[1]}`
        : `${chunks.slice(0, -1).join(", ")}, and ${chunks[chunks.length - 1]}`;
  let s = `- Retrieved excerpts below combine **semantic RAG** over ${list}. They may be incomplete; tools are authoritative for full text.`;
  if (!ragIncludeMemory) {
    s +=
      " Memory excluded from RAG still appears in \`memory_*\` tools (full list).";
  }
  return s;
};

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: "Sign in to send messages and use the workspace.",
        code: "UNAUTHORIZED",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const apiKey = getServerOpenRouterKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "AI is not configured on this server. Set OPENROUTER_API_KEY on the host.",
        code: "OPENROUTER_UNAVAILABLE",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const chatMode: ChatMode = parseChatModeHeader(
    req.headers.get("x-chat-mode"),
  );
  const modelId = resolveChatModelId(chatMode);
  const embeddingModel = getEmbeddingModelId();
  const billable = isChatBillable(chatMode);
  const hosted = true;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = ChatBodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    messages: rawMessages,
    notes: requestNotes,
    researchSnippets: requestResearchSnippets,
    memory: requestMemoryEntries,
    mode,
    activeDocument,
    activeSheet,
    workspaceSheets,
    workspaceDocuments,
    documentPlainText,
    docSelection,
    integrationKeys,
    ragIncludeMemory,
    ragIncludeResearch,
  } = parsed.data;
  if (!rawMessages.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messagesJson = JSON.stringify(rawMessages);
  if (messagesJson.length > MAX_MESSAGES_JSON_CHARS) {
    return new Response(
      JSON.stringify({
        error: "Messages payload too large. Remove old images or start a new chat.",
      }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  const quotaEnforced = hosted && isDbConfigured();
  if (quotaEnforced) {
    const qc = await checkChatQuota(userId, { billable });
    if (!qc.ok) {
      return new Response(
        JSON.stringify({
          error: qc.message,
          code: "QUOTA_EXCEEDED",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const uiMessages = rawMessages as UIMessage[];
  const queryText = getLatestUserTextFromUiMessages(uiMessages);

  const openrouter = createOpenRouter({ apiKey });
  const { tools: noteTools } = createNotesToolset(requestNotes as Note[]);
  const { tools: memoryTools } = createMemoryToolset(
    requestMemoryEntries as MemoryEntry[],
  );
  const { tools: docCreationTools } = createDocumentCreationToolset();
  const { tools: docsEditorTools } = createDocsEditorToolset();

  const isDocsMode = mode === "docs";

  const sheetsById = new Map<
    string,
    { revision: number; title: string; rowCount: number; colCount: number }
  >();
  for (const s of workspaceSheets) {
    sheetsById.set(s.id, {
      revision: s.revision,
      title: s.title,
      rowCount: WORKSPACE_SHEET_ROWS,
      colCount: WORKSPACE_SHEET_COLS,
    });
  }
  if (activeSheet) {
    sheetsById.set(activeSheet.id, {
      revision: activeSheet.revision,
      title: activeSheet.title,
      rowCount: WORKSPACE_SHEET_ROWS,
      colCount: WORKSPACE_SHEET_COLS,
    });
  }

  const { tools: sheetsTools } = createSheetsToolset({
    sheetsById,
    defaultSheetId: activeSheet?.id,
  });

  const workspaceReadToolset =
    !isDocsMode &&
    (workspaceDocuments.length > 0 || workspaceSheets.length > 0)
      ? createWorkspaceReadToolset(
          workspaceDocuments.map((d) => ({
            id: d.id,
            title: d.title,
            plainText: d.plainText,
          })),
          workspaceSheets.map((s) => ({
            id: s.id,
            title: s.title,
            csvPreview: s.csvPreview,
          })),
          24_000,
        ).tools
      : {};

  const c7Key = integrationKeys?.context7ApiKey?.trim();
  const exaKey = integrationKeys?.exaApiKey?.trim();
  const nativeOn = integrationKeys?.nativeSearchEnabled === true;
  const webToolsAvailable = nativeOn || Boolean(exaKey);
  const githubOn = integrationKeys?.githubEnabled === true;
  const githubTok = integrationKeys?.githubToken?.trim();

  const context7Tools = c7Key ? createContext7Toolset(c7Key).tools : {};
  const exaTools = exaKey ? createExaSearchToolset(exaKey).tools : {};
  const nativeTools = nativeOn ? createNativeSearchToolset().tools : {};
  const githubTools = githubOn
    ? createGithubToolset({ token: githubTok }).tools
    : {};

  const tools = isDocsMode
    ? {
        ...docsEditorTools,
        ...sheetsTools,
        ...noteTools,
        ...memoryTools,
        ...docCreationTools,
      }
    : {
        ...noteTools,
        ...memoryTools,
        ...docCreationTools,
        ...workspaceReadToolset,
        ...nativeTools,
        ...githubTools,
        ...context7Tools,
        ...exaTools,
      };

  let ragBlock = "";
  try {
    ragBlock = await buildUnifiedRagContextBlock({
      apiKey,
      embeddingModelId: embeddingModel,
      userQuery: queryText,
      notes: requestNotes as Note[],
      researchSnippets: requestResearchSnippets as ResearchSnippet[],
      memoryEntries: requestMemoryEntries as MemoryEntry[],
      ragIncludeMemory,
      ragIncludeResearch,
    });
  } catch {
    ragBlock = "";
  }

  const docCreationInstructions = `
## Document files (chat mode)
When the user asks for an Excel spreadsheet, a Word document, or a CSV/Markdown/text file, call the appropriate tool (\`create_spreadsheet\`, \`create_word_document\`, \`create_text_document\`). The UI builds the file in the browser for download. Do not paste huge tables or base64 in the message text; use tools and briefly summarize.`;

  const webHarnessOff = !webToolsAvailable
    ? `## Live web lookup (disabled for this session)
No live web search tools are available. If the user asks for **breaking news**, **search the web**, or other **fresh public** facts, tell them to open **Marketplace** and enable **Built-in web lookup** and/or add an **Exa** API key, then retry. You still have notes, memory, workspace, docs/sheets context, and file-creation tools.`
    : "";

  const webHarnessOn = webToolsAvailable
    ? `## Current events and the public web
When the user asks for breaking news, to **search the web**, or other **live / fresh public** information: call \`native_web_lookup\` and/or \`exa_search\` **before** answering from memory alone—use whichever tool fits (Exa for broad search when enabled; \`native_web_lookup\` for quick facts and Wikipedia-backed topics). Synthesize from tool output. **Do not** claim you cannot access the public web while these tools are available.`
    : "";

  const retrievedHeading = ragRetrievedHeading(
    ragIncludeMemory,
    ragIncludeResearch,
  );
  const ragBehaviorLine = ragBehaviorClause(
    ragIncludeMemory,
    ragIncludeResearch,
  );

  const chatSystem = `You are Caulfield.ai — a capable assistant with **full access** to the user's **notes** and **memory** through tools.

Behavior:
- Use \`notes_*\` tools to list, read, search, create, update, or delete notes whenever it helps.
- Use \`memory_*\` tools to persist durable facts, preferences, or summaries the user (or you) would want recalled later; prefer \`memory_create\` when the user explicitly asks to remember something important.
- After mutating notes or memory, briefly confirm what changed (titles and ids when useful).
- Prefer \`notes_list\`, \`notes_search\`, \`notes_read\`, \`memory_list\`, \`memory_search\`, or \`memory_read\` instead of guessing when the user refers to stored content.
${ragBehaviorLine}

${docCreationInstructions}

${webHarnessOff}

${
  c7Key || exaKey || nativeOn || githubOn
    ? `## Marketplace connectors (enabled for this session)
${
  nativeOn
    ? `- **Built-in web lookup:** \`native_web_lookup\` — DuckDuckGo instant data + Wikipedia search (no vendor API key).`
    : ""
}
${
  githubOn
    ? `- **GitHub:** \`github_search_repositories\`, \`github_get_repository_readme\`, \`github_get_repository_file\` for public repos.`
    : ""
}
${
  c7Key
    ? `- **Context7:** \`context7_search_libraries\` (find \`libraryId\`), then \`context7_get_context\` for doc snippets.`
    : ""
}
${
  exaKey
    ? `- **Exa:** \`exa_search\` for live web search and sources.`
    : ""
}
Use these when the user needs documentation, repos, or the open web; prefer tools over guessing.`
    : ""
}

${webHarnessOn}

${
  workspaceDocuments.length || workspaceSheets.length
    ? (() => {
        const lines: string[] = [];
        if (workspaceDocuments.length) {
          lines.push("## Workspace documents (Docs tab)");
          for (const d of workspaceDocuments) {
            const excerpt = truncate(
              d.plainText.replace(/\s+/g, " ").trim(),
              WORKSPACE_CHAT_INDEX_EXCERPT,
            );
            lines.push(
              `- **${d.title}** — \`id\`: \`${d.id}\`, revision ${d.revision}${excerpt ? ` — ${excerpt}` : " — _empty_"}`,
            );
          }
        }
        if (workspaceSheets.length) {
          lines.push("## Workspace sheets (Sheets tab)");
          for (const s of workspaceSheets) {
            const excerpt = truncate(
              s.csvPreview.replace(/\n/g, " | ").trim(),
              WORKSPACE_CHAT_INDEX_EXCERPT,
            );
            lines.push(
              `- **${s.title}** — \`id\`: \`${s.id}\`, revision ${s.revision}${excerpt ? ` — ${excerpt}` : " — _empty_"}`,
            );
          }
        }
        lines.push(
          "Use \`workspace_read_document\` / \`workspace_read_sheet\` with these ids when you need more than the excerpt.",
        );
        return `\n${lines.join("\n")}`;
      })()
    : ""
}

${retrievedHeading}
${ragBlock || "_No excerpts (empty library or retrieval skipped)._"}`;

  let docsSystem = `You are Caulfield.ai — a **document editor** for the Docs workspace.

Rules:
- You receive the current document as plain text and as TipTap JSON. Prefer \`docs_apply_edits\` for any change.
- **docRevision** in every \`docs_apply_edits\` call MUST exactly match the revision number in the context below, or the client will reject your edits.
- **\`edits\`** must be a JSON **array** of edit objects, a **single** edit object, or (if the API stringifies tool args) a **string** containing JSON of either—the server normalizes all of these. Prefer a real array in tool arguments when possible.

**Edit types** (each edit has \`type\`):
- \`replace_range\`: \`from\`, \`to\` (half-open ProseMirror positions), \`content\` — delete that range and insert TipTap JSON at \`from\`. Use to change existing text.
- \`insert_at\`: \`pos\`, \`content\` — insert at \`pos\` without deleting. Use for additions that should not remove adjacent characters.
- \`delete_range\`: \`from\`, \`to\` — delete only. Use to remove a span.

\`content\` must be valid TipTap/ProseMirror JSON (e.g. \`paragraph\` with \`text\` children), not raw prose, except the server may coerce plain strings to a paragraph.

The client applies a batch in **descending anchor order** (\`from\` for replace/delete, \`pos\` for insert). Prefer a single edit when possible; when combining several, avoid overlapping ranges.
- **Avoid huge tool payloads:** long stories should use multiple smaller \`insert_at\` / \`replace_range\` calls or compact \`paragraph\` arrays—not one giant stringified \`edits\` value that providers may truncate.
- When the user has highlighted text, prioritize edits that touch the selection range (\`from\`/\`to\` from **Current selection**).
- **Sheets tab:** use \`sheets_apply_cells\` for workspace spreadsheets. \`sheetRevision\` must match the sheet revision in context; omit \`sheetId\` to target the active sheet.
- **Notes, memory & downloads:** you also have \`notes_*\`, \`memory_*\` tools and file-creation tools (\`create_spreadsheet\`, etc.) like main chat—use them when the user asks.
- Be concise in natural-language replies after editing.

${webHarnessOff}

${webHarnessOn}

${retrievedHeading}
${ragBlock || "_No excerpts._"}`;

  if (isDocsMode && activeDocument) {
    const jsonStr = JSON.stringify(activeDocument.contentJson);
    const plain = documentPlainText ?? "";
    docsSystem += `

## Active document
- **id:** ${activeDocument.id}
- **title:** ${activeDocument.title}
- **revision:** ${activeDocument.revision} — pass this as \`docRevision\` to \`docs_apply_edits\`.

### Plain text
${truncate(plain, 100_000)}

### TipTap JSON
${truncate(jsonStr, 60_000)}`;
    if (docSelection?.text) {
      docsSystem += `

### Current selection
- **from:** ${docSelection.from}, **to:** ${docSelection.to}
- **text:** ${truncate(docSelection.text, 12_000)}`;
    }
  } else if (isDocsMode) {
    docsSystem += `

## Active document
_No document metadata was sent. Ask the user to select or create a document._`;
  }

  if (isDocsMode && (activeSheet || workspaceSheets.length > 0)) {
    docsSystem += `

## Workspace sheets`;
    if (activeSheet) {
      const preview = activeSheet.rows.map((r) => r.join("\t")).join("\n");
      docsSystem += `

### Active sheet
- **id:** ${activeSheet.id}
- **title:** ${activeSheet.title}
- **revision:** ${activeSheet.revision} — pass as \`sheetRevision\` to \`sheets_apply_cells\` (omit \`sheetId\` to target this sheet).

Tab-separated preview:
${truncate(preview, 14_000)}`;
    }
    if (workspaceSheets.length > 0) {
      docsSystem += `

### Sheet index`;
      for (const s of workspaceSheets) {
        docsSystem += `
- **${s.title}** — \`id\` \`${s.id}\`, revision ${s.revision}`;
      }
    }
  }

  const system = isDocsMode ? docsSystem : chatSystem;

  try {
    const coreMessages = await convertToModelMessages(
      uiMessages.map(({ id, ...rest }) => {
        void id;
        return rest;
      }),
      { tools },
    );

    const result = streamText({
      model: openrouter(modelId),
      system,
      messages: coreMessages,
      tools,
      stopWhen: stepCountIs(14),
      onFinish: async () => {
        if (quotaEnforced) {
          try {
            await consumeChatQuery(userId, { billable });
          } catch (e) {
            console.error("[chat] Failed to consume quota onFinish", e);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to run completion";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
