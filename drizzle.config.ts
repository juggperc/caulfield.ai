import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

import {
  resolveMigrateDatabaseUrl,
  urlRequiresPrepareDisabled,
} from "./src/lib/db/database-url";

// drizzle-kit does not load .env.local — same order as Next.js: .env then overrides from .env.local
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const migrateUrl = resolveMigrateDatabaseUrl() ?? "";

if (migrateUrl && urlRequiresPrepareDisabled(migrateUrl)) {
  console.warn(
    "[drizzle-kit] This URL looks like a transaction pooler. `npm run db:push` often hangs on \"pulling schema\".\n" +
      "  Use POSTGRES_URL_NON_POOLING (Supabase/Vercel), or set DRIZZLE_DATABASE_URL to the direct Postgres URI (port 5432, session mode).",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrateUrl,
  },
});
