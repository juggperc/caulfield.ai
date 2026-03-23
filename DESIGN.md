# Caulfield.ai — design guidelines

Reference for humans and coding agents. Goal: **minimal black-and-white product UI**, **typography-first**, **no marketing chrome**, behavior similar to **Claude’s functional web app**, with a dedicated **Apple Notes–inspired** surface for notes.

---

## Global principles

1. **Restraint** — Prefer fewer borders, fewer colors, and quiet hierarchy over decoration.
2. **Typography carries structure** — Size, weight, and spacing do the work; avoid heavy cards and gradients except in the logo strip.
3. **Neutral palette** — `background`, `foreground`, `muted`, `border` from theme. No rainbow accents unless semantically required (e.g. destructive).
4. **Motion** — Framer Motion: short (≈200–300ms), spring-ish or ease-out; opacity and small `y`/`x` shifts only. No bounce or playful overshoot.
5. **Accessibility** — Visible focus, `aria-label` on icon-only controls, logical heading order in each panel.

---

## Layout shell

- **Sidebar (fixed, ~18rem)** — App navigation: logo, Chat, Notes, Docs, Library, Marketplace. Nav scrolls if needed (`overflow-y-auto`). Active item uses `bg-sidebar-accent` + full foreground; inactive uses `text-muted-foreground`.
- **Main** — `pl-72` (or `MAIN_OFFSET_CLASS`). Content is **full height** with `min-h-0` + flex so scroll regions and bottom bars work.
- **Chat** — Feed scrolls; input **anchored to bottom** of the main column.
- **Notes** — Two-pane: **narrow list** + **wide editor** (see Notes section).
- **Docs workspace** — Three-pane: **document list** + **TipTap editor** + **Doc assistant** (see Documents section). Sub-tabs **Docs** | **Sheets**; Sheets is a placeholder.
- **Library** — Same shell rhythm as Chat (no page title bar). Top row: **Upload** only. Responsive **card grid** (`border-border`, `bg-card`): filename, source badge (generated / upload), modified date, Download + Delete. Generated chat files are ingested automatically (IndexedDB); user **Upload** adds more. No large blobs in `localStorage`.
- **Marketplace** — No page title bar; **catalog cards** with icon tiles. **Built-in web lookup** (no vendor key) and **GitHub** (optional PAT) plus Context7 and Exa. Keys and toggles are **local-only** (`localStorage`); each chat request may include enabled integrations in the JSON body so `/api/chat` can call upstream HTTPS APIs—same trust model as OpenRouter headers.

---

## Typography

- **Font stack** — Geist Sans globally (`next/font`); Geist Mono for code (see `CodeBlock`).
- **Chat / default** — Body ~15px equivalent (`text-[0.9375rem]`), relaxed line-height.
- **Notes list** — 13px titles, 11px metadata; **editor title** ~22px bold; **editor body** ~15px, relaxed leading.
- **Logo wordmark** — `text-lg font-bold` on a **frosted theme chip** (`bg-background/88`, `text-foreground`, light blur) so contrast is stable while the blurred blob field animates behind it.

---

## Chat UI

- **User bubbles** — Rounded (`rounded-2xl`), `bg-muted`, border optional; align end; `whitespace-pre-wrap` for plain text.
- **Assistant** — No heavy bubble; markdown typography with restrained headings and lists (`MarkdownMessage`). Tool parts may render **generated file** rows: compact bordered row, muted background, **Download** control with clear `aria-label` (files are built in the **browser** from JSON tool output—no base64 dumps in message text).
- **Code** — Dark block, language label, copy control (`CodeBlock`); aligns with “Claude-like” utilitarian code areas.
- **Input** — Bordered rounded container, tool row **above** the textarea row; settings and send aligned with the field.

---

## Notes UI (Apple Notes–like)

**Intent:** Calm, paper-adjacent, **not** a generic dashboard.

| Element | Guideline |
|--------|-----------|
| **Chrome background** | `#f5f5f7` (list column and outer notes shell). |
| **Editor surface** | White `#ffffff`, no card shadow on the whole pane. |
| **List row (selected)** | Warm cream `#fdf6d9`, subtle inset ring `rgba(0,0,0,0.06)`; avoid loud yellow. |
| **List row (default)** | Transparent; hover `black/[0.04]`. |
| **Search** | Compact height (~32px), white field, light ring `black/6`; magnifier icon muted. |
| **Separators** | `border-black/6` or `border-black/8` — hairline, not thick rules. |
| **Title field** | Large, bold, borderless; placeholder “Title”. |
| **Body** | Borderless `textarea`, `resize-none`, fills remaining height. |
| **Empty states** | Short neutral sentence; no illustrations required. |

Do **not** mix chat bubble styling into the notes editor. Keep notes feeling **document-first**.

---

## Agent & notes (product behavior)

- Notes are **local-first** (`localStorage`); the **chat API receives a snapshot** on each request for RAG + tools.
- **RAG** — Embedding model (settings) + chunked notes → top excerpts injected into **system** prompt. Tools remain source of truth for full content.
- **Tools** — Agent can list, read, keyword-search, create, update, delete. Any tool result that includes a `notes` array syncs back to the client store after the assistant message finishes.

When changing this flow, update this section so agents stay aligned.

---

## Documents & Docs workspace

- **In-chat file creation (Phase A)** — The chat API exposes tools that return **structured `file_spec` JSON** only (spreadsheets, Word outlines, csv/md/txt). The client turns specs into **Blob** downloads via `exceljs` / `docx` (dynamic import). This keeps **Vercel** function payloads small and avoids heavy serialization on the server.
- **Docs (Phase B)** — Workspace documents are **local-first** (`localStorage`), same spirit as notes. Each request to `/api/chat` with `mode: "docs"` sends the active document snapshot + plain text + optional **selection** (`from` / `to` / `text`) for “edit selection” flows. The model uses `docs_apply_edits` with **TipTap/ProseMirror** JSON; the client applies edits and bumps **revision** only after successful applies (used to reject stale tool calls).
- **Do not** mix chat bubble styling into the rich editor; keep the center column **document-first** like Notes.

---

## Marketplace connectors (MCP-aligned)

- **Not stdio MCP on Vercel** — Connectors are implemented as **chat tools** that `fetch` upstream HTTP APIs (vendor or public). See [`src/features/mcp/README.md`](src/features/mcp/README.md).
- **Built-in web lookup** — `native_web_lookup` (DuckDuckGo + Wikipedia) when enabled; **no third-party API key**; outbound `fetch` uses a **timeout** suitable for serverless.
- **GitHub** — `github_search_repositories`, `github_get_repository_readme`, `github_get_repository_file` when enabled; optional PAT for higher rate limits.
- **Context7** — `context7_search_libraries`, `context7_get_context` when a key is enabled in Marketplace and sent with the chat body.
- **Exa** — `exa_search` when enabled and keyed.
- **Security** — Do not log connector keys; truncate large tool JSON responses server-side to protect context limits.

---

## File organization

- Domain UI under `src/features/{sidebar,chat-ui,notes,documents,library,marketplace,integrations,mcp,ai-agent,shell}`.
- Shared primitives under `src/components/ui` (shadcn / Base UI).
- Cross-cutting helpers under `src/lib/`.

---

## What to avoid

- Marketing hero sections, feature grids, or onboarding copy on the home route.
- Saturated accent colors for primary actions (stick to neutral / primary token).
- Heavy drop shadows on every container.
- Hydration-sensitive randomness during SSR for client components — generate procedural or random UI **after** client hydration (e.g. `useSyncExternalStore` pattern for logo).
