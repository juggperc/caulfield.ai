import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const isDev = process.env.NODE_ENV === "development";

/** Insecure placeholder — only used when `AUTH_SECRET` is unset in development. */
const DEV_FALLBACK_AUTH_SECRET =
  "caulfield-dev-only-insecure-auth-secret-not-for-production";

const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  (isDev ? DEV_FALLBACK_AUTH_SECRET : undefined);

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
  authorize: async () => ({
    id: "dev-local-user",
    email: "dev@local.test",
    name: "Local Dev",
  }),
});

const providers = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.AUTH_DEV_LOGIN === "1") {
  providers.push(devCredentialsProvider);
} else if (isDev && providers.length === 0) {
  providers.push(devCredentialsProvider);
  if (
    typeof globalThis !== "undefined" &&
    !(globalThis as { __caulfieldDevLoginWarned?: boolean })
      .__caulfieldDevLoginWarned
  ) {
    (globalThis as { __caulfieldDevLoginWarned?: boolean })
      .__caulfieldDevLoginWarned = true;
    console.warn(
      "[auth] No OAuth providers — enabled \"Dev login\" for development. Set GITHUB_ID/GITHUB_SECRET or AUTH_DEV_LOGIN=1 explicitly if you prefer.",
    );
  }
}

if (
  providers.length === 0 &&
  !isDev &&
  typeof globalThis !== "undefined" &&
  !(globalThis as { __caulfieldAuthWarned?: boolean }).__caulfieldAuthWarned
) {
  (globalThis as { __caulfieldAuthWarned?: boolean }).__caulfieldAuthWarned =
    true;
  console.warn(
    "[auth] No auth providers configured. Set GITHUB_ID/GITHUB_SECRET and/or Google OAuth in production.",
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
  session: db ? { strategy: "database" } : { strategy: "jwt" },
  secret: authSecret,
  trustHost: true,
  providers,
  callbacks: {
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
