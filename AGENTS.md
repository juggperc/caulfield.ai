<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview

caulfield.ai is a single Next.js 16 app (App Router, React 19, TypeScript 5, Tailwind CSS 4). Not a monorepo. No test suite exists.

### Running the app

- `npm run dev` — starts dev server on port 3000 (Turbopack).
- `npm run lint` — ESLint.
- `npm run build` — production build.
- See `README.md` **Scripts** table for the full list.

### Environment & auth

- No `.env.local` is required for local dev. The app auto-generates `AUTH_SECRET` and enables a "Dev login" credentials provider when no OAuth env vars are set.
- Without `DATABASE_URL`, auth uses JWT sessions and all data is browser-local (BYO-key mode).
- Without `OPENROUTER_API_KEY`, users supply their own key via the in-app Settings UI.
- PostgreSQL is only needed for "hosted mode" (auth sessions, quotas, billing).

### Gotchas

- The `[auth]` warning "No auth providers configured" during build/dev is expected when no OAuth env vars are set — dev login still works.
- There is no `.env.example` file despite the README referencing one.
- No automated tests exist in this repo; validation is manual (lint + build + browser).
