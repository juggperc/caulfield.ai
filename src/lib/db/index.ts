import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  postgresOptionsForRuntimeUrl,
  resolveRuntimeDatabaseUrl,
} from "./database-url";
import * as schema from "./schema";

export type AppDb = PostgresJsDatabase<typeof schema>;

const conn = resolveRuntimeDatabaseUrl();

const client = conn
  ? postgres(conn, postgresOptionsForRuntimeUrl(conn))
  : null;

export const db: AppDb | null = client
  ? drizzle(client, { schema })
  : null;

export const isDbConfigured = (): boolean => Boolean(db);
