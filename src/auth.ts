import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { parseUsername } from "@/lib/auth/username";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const isDev = process.env.NODE_ENV === "development";

/** Insecure placeholder — only used when `AUTH_SECRET` is unset in development. */
const DEV_FALLBACK_AUTH_SECRET =
  "caulfield-dev-only-insecure-auth-secret-not-for-production";

const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  (isDev ? DEV_FALLBACK_AUTH_SECRET : undefined);

const DEV_USER_ID = "dev-local-user";

if (isDev && !process.env.AUTH_SECRET?.trim()) {
  if (
    typeof globalThis !== "undefined" &&
    !(globalThis as { __caulfieldAuthSecretWarned?: boolean })
      .__caulfieldAuthSecretWarned
  ) {
    (globalThis as { __caulfieldAuthSecretWarned?: boolean })
      .__caulfieldAuthSecretWarned = true;
    console.warn(
      "[auth] AUTH_SECRET not set — using a built-in development secret. Add AUTH_SECRET to .env.local (see .env.example) for a stable secret.",
    );
  }
}

const devCredentialsProvider = Credentials({
  id: "dev",
  name: "Dev login",
  credentials: {},
  authorize: async () => {
    if (!isDev || process.env.AUTH_DEV_LOGIN !== "1") {
      return null;
    }
    if (!db) {
      return {
        id: DEV_USER_ID,
        email: "dev@local.test",
        name: "Local Dev",
      };
    }
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, DEV_USER_ID))
      .limit(1);
    if (existing[0]) {
      return {
        id: existing[0].id,
        email: existing[0].email ?? undefined,
        name: existing[0].name ?? "Local Dev",
      };
    }
    await db.insert(schema.users).values({
      id: DEV_USER_ID,
      name: "Local Dev",
      email: "dev@local.test",
      username: null,
      passwordHash: null,
    });
    return {
      id: DEV_USER_ID,
      email: "dev@local.test",
      name: "Local Dev",
    };
  },
});

const credentialsProvider = Credentials({
  id: "credentials",
  name: "Username & password",
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" },
  },
  authorize: async (credentials) => {
    if (!db) return null;

    const usernameRaw = credentials?.username?.toString().trim();
    const password = credentials?.password?.toString();

    if (!usernameRaw || !password) return null;

    const parsed = parseUsername(usernameRaw);
    if (!parsed.ok) return null;

    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, parsed.username))
      .limit(1);
    const row = rows[0];
    if (!row?.passwordHash) return null;

    const match = await bcrypt.compare(password, row.passwordHash);
    if (!match) return null;

    return {
      id: row.id,
      name: row.name ?? parsed.username,
      email: row.email ?? undefined,
    };
  },
});

const providers = [];

if (isDev && process.env.AUTH_DEV_LOGIN === "1") {
  providers.push(devCredentialsProvider);
}

if (db) {
  providers.push(credentialsProvider);
}

if (
  providers.length === 0 &&
  typeof globalThis !== "undefined" &&
  !(globalThis as { __caulfieldAuthWarned?: boolean }).__caulfieldAuthWarned
) {
  (globalThis as { __caulfieldAuthWarned?: boolean }).__caulfieldAuthWarned =
    true;
  console.warn(
    "[auth] No sign-in providers. Set DATABASE_URL for username/password auth, or enable AUTH_DEV_LOGIN=1 in development.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
        authenticatorsTable: schema.authenticators,
      })
    : undefined,
  // Credentials sign-in is only allowed with JWT sessions (not database sessions).
  // See https://errors.authjs.dev#unsupportedstrategy — user rows still live in Postgres via the adapter.
  session: { strategy: "jwt" },
  secret: authSecret,
  trustHost: true,
  pages: {
    signIn: "/sign-in",
  },
  providers,
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const next = new URL(url);
        if (next.origin === baseUrl) return url;
      } catch {
        /* invalid */
      }
      return baseUrl;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, user, token }) {
      if (session.user) {
        const id =
          user?.id ??
          (typeof token?.id === "string" ? token.id : undefined) ??
          token?.sub;
        session.user.id = id ?? "";
      }
      return session;
    },
  },
});
