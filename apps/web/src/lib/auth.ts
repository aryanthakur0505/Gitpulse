import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { internalApi } from "./api";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request scope to read public repo data in later phases
          scope: "read:user user:email public_repo",
        },
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "github" || !profile) return false;

      const syncPayload = {
        githubId: String((profile as { id?: number }).id ?? ""),
        name: user.name,
        email: user.email,
        avatarUrl: user.image,
      };

      type SyncResponse = { success: boolean; user: { id: string }; token: string };

      // Retry once — Render free tier cold boot can exceed the first attempt's timeout
      let res;
      try {
        res = await internalApi.post<SyncResponse>("/auth/sync", syncPayload);
      } catch (firstErr) {
        console.warn("[NextAuth] First /auth/sync attempt failed, retrying once...", firstErr);
        try {
          res = await internalApi.post<SyncResponse>("/auth/sync", syncPayload);
        } catch (err) {
          console.error("[NextAuth] Failed to sync user with API after retry:", err);
          return false;
        }
      }

      if (!res.data.success) return false;

      // Stash the API token and user id on the user object temporarily
      // (picked up in jwt callback below)
      (user as unknown as Record<string, unknown>).__apiToken = res.data.token;
      (user as unknown as Record<string, unknown>).__userId = res.data.user.id;

      return true;
    },


    async jwt({ token, user, account }) {
      // First sign-in: persist data from user object into the JWT
      if (user) {
        token.userId = (user as unknown as Record<string, unknown>).__userId as string;
        token.apiToken = (user as unknown as Record<string, unknown>).__apiToken as string;
        token.githubId = String(
          (account as Record<string, unknown> | null)?.providerAccountId ?? ""
        );
        token.accessToken = (account?.access_token as string | undefined) ?? "";
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.githubId = token.githubId as string;
      session.apiToken = token.apiToken as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
