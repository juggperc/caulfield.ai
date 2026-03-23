import { defineConfig } from "drizzle-kit";
import { resolveMigrateDatabaseUrl } from "./src/lib/db/database-url";

const migrateUrl = resolveMigrateDatabaseUrl() ?? "";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrateUrl,
  },
});
