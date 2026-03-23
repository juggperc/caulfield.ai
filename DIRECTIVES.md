# caulfield.ai — engineering directives

**Audience:** A model or engineer taking the app from its current state to **production-ready** and **feature-complete**.  
**Companion docs:** [`README.md`](./README.md) (user-facing setup), [`DESIGN.md`](./DESIGN.md) (UX notes), [`.env.example`](./.env.example) (configuration surface).

---

## 1. North star (ultimate goal)

**Product:** A **local-first AI workspace** — chat, notes, TipTap documents, spreadsheets, library, Deep Research, and memory — unified with **semantic RAG** and **tool-using** agents, powered by **OpenRouter** so models are swappable.

**Commercial / hosted trajectory:**

- Offer a **hosted** deployment where the **platform** holds the OpenRouter key; users **sign in**, get **server-persisted chat history**, and operate under **usage quotas** with **Polar** for subscriptions ($20/mo product aligned with **100 queries / billing period** in code).
- Preserve a **BYO key** path: no server OpenRouter key, credentials in the browser, no mandatory DB — for privacy-focused or self-hosted users.

**Quality bar for “done”:**

- Auth, billing, and webhooks are **correct, tested, and documented** against real Polar + OAuth providers.
- **No silent data loss** (chat history, subscriptions, usage).
- **Observable** errors in UI (quota, auth, billing) — not opaque 500s.
- **Automated tests** for critical paths (auth gating, quota math, webhook parsing, conversation APIs).
- **Security review:** secrets only on server; connector keys not leaked; webhook signature verification matches Polar’s live format.

---

## 2. What is built today (summary)

### 2.1 Core workspace (client-heavy)

| Area | Status | Notes |
|:-----|:-------|:------|
| **Chat** | Shipped | Streaming UI (`@ai-sdk/react`), tools for notes, memory, docs, sheets, workspace read, optional web/GitHub/Context7/Exa via Marketplace toggles + client keys. |
| **RAG** | Shipped | Embeddings + retrieval over notes, research snippets, memory; toggles in chat settings for RAG inclusion. |
| **Notes** | Shipped | Local persistence; agent CRUD tools; sync back to UI. |
| **Docs & sheets** | Shipped | TipTap + CSV-style sheets; agent edit tools; workspace context in API payload. |
| **Library** | Shipped | IndexedDB for files; optional workspace sync to library items. |
| **Deep Research** | Shipped | Modal / chat bar entry; `/api/research` multi-step agent; snippets stored locally; optional RAG participation. |
| **Memory** | Shipped | Durable facts; `memory_*` tools; RAG toggle. |
| **Marketplace** | Shipped | Connector UI; **remote MCP** cards are **informational only** (links), not wired into in-app chat execution. |
| **Theme / UX** | Shipped | Light/dark/system, motion, context menu — see `DESIGN.md`. |

### 2.2 Backend & data (Postgres + Drizzle)

| Surface | Status | Schema / routes |
|:--------|:-------|:----------------|
| **Auth** | Shipped | NextAuth (Auth.js) v5; Drizzle adapter when `DATABASE_URL` set; GitHub + Google + **Dev login** (Credentials); dev `AUTH_SECRET` fallback; `JWT` session when no DB. |
| **Conversations** | Shipped | `conversation`, `chat_message` tables; CRUD-style API under `src/app/api/conversations/`. |
| **Usage & billing rows** | Shipped | `user_usage`, `billing_subscription`; quota helpers in `src/lib/billing/quota.ts`. |
| **Polar webhook** | Shipped (fragile) | `POST /api/webhooks/polar` — HMAC verification when `POLAR_WEBHOOK_SECRET` set; payload parsing centralized in `src/lib/billing/polar-webhook-sync.ts`. **Must be validated against Polar’s real signature scheme.** |
| **Checkout** | Shipped | `GET /api/billing/checkout` → Polar URL + `metadata[userId]`; in **development** without `POLAR_CHECKOUT_URL`, redirects to mock checkout. |
| **Quota API** | Shipped | `GET /api/billing/quota` for sidebar display. |
| **Public config** | Shipped | `GET /api/config` — hosted OpenRouter flag, DB configured, default models, OAuth configured (no secrets). |

### 2.3 Client ↔ server integration

| Behavior | Status |
|:---------|:-------|
| **ChatShell + auth** | **Fixed:** History bootstrap depends on `useSession()` + `cfg` + `user?.id` so **sign-in after first paint** still loads server conversations and enables `persistServerHistory`. |
| **Hosted mode** | When `OPENROUTER_API_KEY` + `DATABASE_URL`: `/api/chat` and `/api/research` require sign-in; quota enforced via `checkChatQuota` / `consumeChatQuery`. |
| **BYO mode** | No server key: client sends OpenRouter headers from local storage; quota not enforced server-side. |

### 2.4 Developer tooling

| Item | Status |
|:-----|:-------|
| **`/dev` page** | Development only: quota snapshot, billing simulations, webhook JSON tester, links to mock/real checkout. |
| **`/api/dev/billing/*`** | Mock checkout, simulate usage/subscription, state dump, unsigned webhook replay — **404 outside `NODE_ENV=development`**. |

### 2.5 Configuration files

- **`.env.example`** — documents `POLAR_ACCESS_TOKEN` but **it is not referenced in the codebase yet** (reserved for future Polar API use, e.g. customer portal or subscription sync).

---

## 3. Architecture snapshot

```text
Browser: AppLayout → panels (chat, notes, docs, library, marketplace)
         SessionProvider (NextAuth react)
         Local state: notes, docs, sheets, library, research, memory (mostly localStorage / IndexedDB)

Server:  Next.js App Router
         /api/chat          — streamText + tools; quota when hosted+DB
         /api/research      — generateText research agent; same quota rules
         /api/conversations — Postgres-backed threads + messages
         /api/auth/[...nextauth]
         /api/billing/*     — checkout redirect, quota
         /api/webhooks/polar
         /api/config

DB:      Drizzle + postgres.js; schema in src/lib/db/schema.ts
```

**Important files for billing/auth/history:**

- `src/auth.ts`
- `src/lib/billing/quota.ts`, `src/lib/billing/polar-webhook-sync.ts`
- `src/features/chat-ui/ChatShell.tsx`
- `src/features/ai-agent/useChatWithOpenRouter.ts`
- `src/app/api/chat/route.ts`, `src/app/api/research/route.ts`

---

## 4. Known gaps & risks (production readiness)

These are **intentional backlog items**, not bugs unless marked.

1. **Polar webhook signature** — Implementation uses `webhook-signature` header and `hex` HMAC of raw body. **Confirm against Polar’s current docs**; adjust if they use a different header, encoding, or signing string.
2. **Quota charging timing** — `consumeChatQuery` runs **before** `streamText` / `generateText` completes. Failed or aborted runs may still consume a credit. Consider charging on successful first token or on stream completion if product requires it.
3. **Dev login user** — Credentials provider returns a **fixed** `dev-local-user` id; fine for local dev, **never** enable in production without replacing with a proper auth strategy.
4. **No automated E2E/API tests** — Lint + manual flows only; add Playwright or Vitest + integration tests for auth, quota, webhooks, conversations.
5. **Connector secrets in browser** — Marketplace keys (Exa, Context7, GitHub token) are **client-side** in BYO mode. Hosted production may need **server-side proxy tools** and encrypted storage per user.
6. **Remote MCP in chat** — Catalog is **not** connected to the runtime agent; “feature complete” for many roadmaps means **either** document as out of scope **or** implement MCP client transport + auth.
7. **`POLAR_ACCESS_TOKEN`** — Placeholder in env; wire up or remove from `.env.example` to avoid confusion.
8. **Observability** — No structured logging/metrics for billing failures, webhook rejects, or quota denials; add for operations.
9. **Rate limiting / abuse** — Beyond per-user quota, consider IP- or token-based limits on `/api/chat` and `/api/research`.
10. **Legal / compliance** — Privacy policy, data retention, export/delete account, and subprocessors if you store chat in Postgres for paying users.

---

## 5. Suggested implementation backlog (prioritized)

Use this as a **checklist** for a stronger model or team. Order can shift with product priorities.

### Phase A — Production correctness (billing & auth)

- [ ] Verify **Polar** webhook signature + payload shapes in a **staging** project; update `polar-webhook-sync` + tests accordingly.
- [ ] End-to-end test: checkout → webhook → `billing_subscription` active → quota allows paid tier → period boundary resets `paidQueriesUsed` (see `resetPaidIfPeriodExpired`).
- [ ] Production **OAuth only** (disable Dev credentials); document `AUTH_SECRET` rotation.
- [ ] Align **Polar product** price/interval with README and in-app copy ($20/mo, 100 queries/period).
- [ ] Decide on **quota consumption** semantics; implement and document (see §4.2).

### Phase B — Reliability & quality

- [ ] Add **API integration tests** for: `POST /api/webhooks/polar` (with/without secret), `GET/POST /api/conversations`, quota boundaries, `GET /api/billing/checkout` redirects.
- [ ] Add **smoke E2E**: sign in → send chat → message persisted → refresh → reload conversation.
- [ ] User-visible handling for **402 QUOTA_EXCEEDED** and **401** in chat UI (retry, subscribe CTA).
- [ ] Structured **logging** for webhook and billing errors (no PII/secrets in logs).

### Phase C — Feature completeness (product-dependent)

- [ ] **Server-side connectors** (optional): proxy Exa/Context7/GitHub from API routes with per-user or org keys stored encrypted in DB.
- [ ] **Remote MCP** (optional): design security model then integrate selected MCP servers into chat tool loop.
- [ ] **`POLAR_ACCESS_TOKEN`**: implement subscription management (cancel, upgrade) or remove env var.
- [ ] **Multi-conversation UX** in sidebar if product requires thread list (currently “first conversation” + New chat pattern in `ChatShell`).
- [ ] **Account settings** page: email, delete account, billing portal link.

### Phase D — Polish & launch

- [ ] LICENSE and legal pages as needed.
- [ ] `npm run build` in CI on every PR; optional preview deploy env with test DB.
- [ ] Performance pass on RAG / large workspace payloads.
- [ ] Accessibility audit on primary flows (chat, sign-in, subscribe).

---

## 6. Commands reference

| Command | Use |
|:--------|:----|
| `npm run dev` | Local development |
| `npm run build` / `npm run start` | Production parity |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply Drizzle schema |
| `npm run db:studio` | Inspect tables |

---

## 7. Handoff checklist for the next implementer

1. Read **§1–2** for vision vs current scope.  
2. Read **`README.md` Configuration** and stand up `.env.local` with real Postgres + OAuth + Polar test project.  
3. Run **`npm run db:push`** and walk through **`/dev`** billing simulations.  
4. Tackle **§5 Phase A** before marketing the hosted product.  
5. Keep **`README.md`** and **`DIRECTIVES.md`** in sync when scope changes.

---

*Last aligned with repo capabilities as of the session that added server chat history, Polar scaffolding, quota enforcement, and dev billing tools. Update this file when major features land.*
