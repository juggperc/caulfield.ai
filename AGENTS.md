<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- After finishing a substantive feature slice, often wants a git commit and push to `main` (or the current branch) when credentials and network allow.
- Frequently asks for complete environment-variable lists for Vercel or production (names and purpose), not one-off hints.
- Account direction for this product: username/password sign-in with bot protection (e.g. ALTCHA), not OAuth.
- When confused about setup or ops, prefers very plain step-by-step instructions and expects the agent to run commands in the real environment rather than only describing them.
- Local shell is Windows PowerShell; avoid bash-only command patterns that fail there (e.g. prefer `;` over `&&` where PowerShell rejects `&&`).

## Learned Workspace Facts

- Client UI that depends on randomness (e.g. procedural Logo backgrounds) must not diverge between SSR and hydration—avoid `Math.random()` during the server render; defer randomness until after hydration or use `useSyncExternalStore` so the server and first client paint match.
- `drizzle-kit push` resolves the DB URL from the **process** environment (`DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `SUPABASE_DATABASE_URL`); `.env.local` alone is often **not** loaded—use a `.env` file in the project root or set the variable in the shell before `npm run db:push`.
- NextAuth.js v5 client `getProviders()` can return `null` while the server still exposes providers; same-origin `fetch("/api/auth/providers")` plus `Object.keys` on the JSON is a reliable way to list provider ids for UI.
- The shared `SessionProvider` should pass `basePath="/api/auth"` so client-side auth requests target the App Router handler consistently.
- The credentials provider is only registered when the server successfully constructs the Drizzle `db` client (a Postgres URL must be available at runtime, e.g. `POSTGRES_URL` from Vercel’s Supabase integration); otherwise the sign-in page shows no username/password provider.
- `ALTCHA_HMAC_KEY` is a long random secret you generate and store in env; `ALTCHA_DEV_BYPASS=1` is optional for local development only, not something required on Vercel.
- Runtime and migrate DB URL helpers live in `src/lib/db/database-url.ts` (pooled vs direct URLs for app vs `db:push`).
