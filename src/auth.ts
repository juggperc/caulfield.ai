import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

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
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: {},
      authorize: async () => ({
        id: "dev-local-user",
        email: "dev@local.test",
        name: "Local Dev",
      }),
    }),
  );
}

if (
  providers.length === 0 &&
  typeof globalThis !== "undefined" &&
  !(globalThis as { __caulfieldAuthWarned?: boolean }).__caulfieldAuthWarned
) {
  (globalThis as { __caulfieldAuthWarned?: boolean }).__caulfieldAuthWarned =
    true;
  console.warn(
    "[auth] No auth providers. Set GITHUB_ID/GITHUB_SECRET, Google OAuth, or AUTH_DEV_LOGIN=1 for local dev.",
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
  secret: process.env.AUTH_SECRET,
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
