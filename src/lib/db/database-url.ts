/**
 * Resolve Postgres URL from env — supports manual `DATABASE_URL` and Vercel’s
 * Supabase integration (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, etc.).
 *
 * @see https://vercel.com/docs/storage/vercel-postgres (same env pattern as Supabase on Vercel)
 */

const trim = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t && t.length > 0 ? t : undefined;
};

/** Pooled URL for the app runtime (serverless-friendly). */
export const resolveRuntimeDatabaseUrl = (): string | undefined =>
  trim(process.env.DATABASE_URL) ??
  trim(process.env.POSTGRES_URL) ??
  trim(process.env.SUPABASE_DATABASE_URL);

/**
 * Direct / session URL for migrations (`drizzle-kit push`).
 * Prefer **non-pooling** before `DATABASE_URL`: transaction poolers (PgBouncer
 * :6543, `pooler.supabase.com`) often cause `db:push` to hang on introspection.
 */
export const resolveMigrateDatabaseUrl = (): string | undefined =>
  trim(process.env.DRIZZLE_DATABASE_URL) ??
  trim(process.env.POSTGRES_URL_NON_POOLING) ??
  trim(process.env.DATABASE_URL) ??
  trim(process.env.POSTGRES_URL) ??
  trim(process.env.SUPABASE_DATABASE_URL);

export const isDatabaseUrlConfigured = (): boolean =>
  Boolean(resolveRuntimeDatabaseUrl());

/**
 * Transaction poolers (Supabase :6543 / pooler host, PgBouncer) cannot use
 * prepared statements with postgres.js. Override with `DATABASE_PREPARE_STATEMENTS=1`
 * if you use a direct Postgres URL that supports them.
 */
export const urlRequiresPrepareDisabled = (url: string): boolean => {
  const override = trim(process.env.DATABASE_PREPARE_STATEMENTS);
  if (override === "1" || override === "true") return false;
  if (override === "0" || override === "false") return true;

  const u = url.toLowerCase();
  return (
    u.includes(":6543") ||
    u.includes("pooler.supabase.com") ||
    u.includes(".pooler.") ||
    u.includes("pgbouncer=true") ||
    u.includes("supavisor")
  );
};

export type PostgresClientOptions = {
  readonly max: number;
  readonly prepare: boolean;
  readonly idle_timeout: number;
  readonly connect_timeout: number;
};

export const postgresOptionsForRuntimeUrl = (
  url: string,
): PostgresClientOptions => {
  const onVercel = process.env.VERCEL === "1";
  const prepare = !urlRequiresPrepareDisabled(url);
  return {
    max: onVercel ? 1 : 10,
    prepare,
    idle_timeout: onVercel ? 10 : 30,
    connect_timeout: 15,
  };
};
