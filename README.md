<div align="center">

# caulfield.ai

**A local-first AI workspace** — chat, notes, rich documents, spreadsheets, and a personal library in one polished Next.js app.  
Powered by **[OpenRouter](https://openrouter.ai/)** so you can swap models without vendor lock-in.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[Features](#-features) · [Quick start](#-quick-start) · [Configuration](#-configuration) · [Scripts](#-scripts)

</div>

---

## Why caulfield.ai?

| | |
|:---|:---|
| **Privacy-friendly** | Notes, docs, and sheets live in **your browser** (localStorage / IndexedDB). Nothing is sent to our servers — only to the AI provider you configure. |
| **One brain, many surfaces** | Same assistant can reason over **notes**, **Deep Research snippets**, **memory**, **workspace docs & sheets**, and optional **marketplace tools** — unified **semantic RAG** where it matters. |
| **Built to feel good** | Dark mode with smooth transitions, motion where it helps, and UI patterns tuned for long sessions. |

---

## Features

### Chat

- Streaming assistant with **tool use** (notes CRUD, file generation, optional web & GitHub & Context7 & Exa when enabled in Marketplace).
- **Semantic retrieval** over **notes**, **saved research snippets**, and **memory** for grounded answers.
- **Syntax-highlighted** code blocks (theme-aware: light/dark).
- **Voice dictation** where supported (Web Speech API).

### Notes

- Fast list + editor, search, full **local persistence**.
- Agent can **create, update, and delete** notes via tools; changes sync back into the UI.

### Docs & Sheets

- **TipTap** rich-text documents with revision-aware **`docs_apply_edits`** from the side assistant.
- In-app **spreadsheets** with CSV export and **`sheets_apply_cells`** for agent-driven updates.
- Workspace context is sent to the API so the model knows what’s open.

### Library

- **IndexedDB** storage for uploads and generated files (Excel, Word, CSV, Markdown, plain text).
- Optional **workspace sync** — notes, docs, and sheets can appear as library items for download.

### Marketplace

- **In-app chat connectors:** **Built-in web lookup** (DuckDuckGo + Wikipedia, **on by default**; turn off in Marketplace if you want), **GitHub** (REST), **Context7**, and **Exa** — vendor keys stay in the browser unless you harden the deployment.
- **Remote MCP catalog:** informational cards for popular **hosted MCP servers** (GitHub Copilot MCP, Canva, Figma, Notion, Hugging Face, Linear, Firecrawl) with brand icons and links — configure those in MCP-capable clients (e.g. Cursor), not inside Caulfield chat yet. See the [KDnuggets remote MCP roundup](https://www.kdnuggets.com/7-free-remote-mcps-you-must-use-as-a-developer) for context.

### Deep Research

- Open **Deep Research** from the **chat bar** (microscope icon) or run it inline in a modal. It uses a **multi-step research agent** (`generateText` + tools, `stopWhen` step budget) with **Wikipedia**, **arXiv**, and **chunked public web fetch** (`/api/research`).
- The agent saves **cited snippets**; they persist in the browser and can be **included in chat semantic RAG** alongside notes and memory (toggle in **chat settings**).

### Memory

- Open **Memory** from the **chat bar** (brain icon) to edit durable facts and preferences. The chat agent has **`memory_*` tools** (list/read/search/create/update/delete) and changes **sync back** to the UI like notes.
- Memory can participate in the **same RAG pipeline** as notes and research; use **chat settings** to turn memory or research **off for RAG only** (tools still receive the full lists).

### Accounts & chat history (scaffold)

- **`SessionProvider`** (`src/features/auth/session-context.tsx`) — stub for **Vercel Auth** / session wiring.
- **`getAccountStorageScope()`** (`src/features/auth/storage-scope.ts`) — namespaces **localStorage** keys (`anon` until sign-in).
- **`chat-history-scaffold.ts`** — types and local key helpers for **per-scope conversation** storage; ready to hook to `useChat` and a future server sync.

### Experience

- **Light / dark / system** theme with **View Transitions** (where supported) and respect for `prefers-reduced-motion`.
- **AI context menu** (heuristic actions) on the main workspace.
- Design notes live in [`DESIGN.md`](./DESIGN.md).

---

## Tech stack

| Layer | Choices |
|:------|:--------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI** | React 19, [Tailwind CSS 4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) patterns, [Framer Motion](https://www.framer.com/motion/) |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai/) + [@openrouter/ai-sdk-provider](https://www.npmjs.com/package/@openrouter/ai-sdk-provider), [Simple Icons](https://simpleicons.org/) (Marketplace brand marks) |
| **Editor** | [TipTap](https://tiptap.dev/) |
| **Validation** | [Zod](https://zod.dev/) |

---

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) 20+ and npm.

```bash
git clone https://github.com/juggperc/caulfield.ai.git
cd caulfield.ai
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

### Production build

```bash
npm run build
npm run start
```

---

## Configuration

Copy **[`.env.example`](./.env.example)** to **`.env.local`** (gitignored) for **auth, database, hosted OpenRouter, and Polar**. See variable comments there.

**Local dev without `.env.local`:** `npm run dev` uses a built-in **`AUTH_SECRET`** and enables **“Dev login”** (Credentials) when no GitHub/Google env vars are set, so **`/api/auth/session`** works out of the box. Set **`AUTH_SECRET`** in `.env.local` for a stable secret across restarts.

### Hosted mode (recommended for production)

When **`OPENROUTER_API_KEY`** is set, **`/api/chat`** and **`/api/research`** use that key on the server (clients do not send your platform key). If **`DATABASE_URL`** is also set, users must **sign in** (GitHub or Google OAuth, **Dev login** in development, or **`AUTH_DEV_LOGIN=1`** to force Dev login even with OAuth configured). **Quotas:** 5 free chat/research requests per account, then **`/api/billing/checkout`** (Polar) for the paid tier (100 requests per billing period — enforced in code; align your Polar product to **$20/mo**).

1. Run **`npm run db:push`** against your Postgres after setting `DATABASE_URL`.
2. Set **`AUTH_SECRET`**, OAuth client IDs/secrets, and deploy **`/api/webhooks/polar`** URL in Polar (optional **`POLAR_WEBHOOK_SECRET`** — verify Polar’s signature format; adjust [`src/app/api/webhooks/polar/route.ts`](src/app/api/webhooks/polar/route.ts) if needed).
3. Set **`POLAR_CHECKOUT_URL`** to your Polar product checkout link; checkout appends **`metadata[userId]`** for the webhook to attach subscriptions to users.

### BYO OpenRouter (no server key)

If **`OPENROUTER_API_KEY`** is unset, behavior matches the original app: open **Settings** in chat, add **OpenRouter API key** and **model ID** (and optional **embedding model** for RAG). Keys stay in **localStorage**. Use **Marketplace** for optional connectors.

---

## Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply Drizzle schema to Postgres (`DATABASE_URL`) |
| `npm run db:studio` | Open Drizzle Studio |

---

## Project layout (high level)

```text
src/
├── app/                 # App Router — page, layout, globals, API routes
│   └── api/
│       ├── auth/        # NextAuth / Auth.js
│       ├── billing/     # Quota + Polar checkout redirect
│       ├── chat/        # Streaming chat + tools (OpenRouter)
│       ├── config/      # Public flags (hosted mode, defaults)
│       ├── conversations/# Server-backed chat history (Postgres)
│       ├── research/    # Deep Research agent (non-streaming JSON)
│       └── webhooks/    # Polar (subscription sync)
├── components/          # Shared UI (theme, dictation, shadcn-style primitives)
├── features/            # Domain: chat-ui, notes, documents, library, marketplace, shell, …
├── hooks/               # e.g. speech dictation
└── lib/                 # RAG, chunking, utilities
```

---

## Deploying

Compatible with **[Vercel](https://vercel.com/)** and any Node host that supports Next.js. For **hosted** AI, set env vars from **`.env.example`**, add **`DATABASE_URL`**, and run **`npm run db:push`**. For **BYO** keys only, you can deploy without DB or server OpenRouter.

**Maintainer habit:** after substantive changes, update this README and push to **`main`** on GitHub when applicable.

---

## Contributing

Issues and PRs are welcome. Please run **`npm run lint`** and **`npm run build`** before submitting.

---

## License

This project is **private** in `package.json`; add a `LICENSE` file when you’re ready to open-source.

---

<div align="center">

**[caulfield.ai on GitHub](https://github.com/juggperc/caulfield.ai)** · Built with care for focus-heavy work

</div>
