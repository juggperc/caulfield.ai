import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDb = PostgresJsDatabase<typeof schema>;

const conn = process.env.DATABASE_URL?.trim();

const client = conn ? postgres(conn, { max: 10 }) : null;

export const db: AppDb | null = client
  ? drizzle(client, { schema })
  : null;

export const isDbConfigured = (): boolean => Boolean(db);
