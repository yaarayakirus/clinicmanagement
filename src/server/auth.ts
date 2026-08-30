import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { storeGoogleTokensFromAccount } from "@/server/clinic-service";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google" && profile?.sub && user.email) {
        await storeGoogleTokensFromAccount({
          googleSubjectId: profile.sub,
          email: user.email,
          name: user.name,
          image: user.image,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        });
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        token.googleSubjectId = profile.sub;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.googleSubjectId === "string") {
        session.user.googleSubjectId = token.googleSubjectId;
      }

      return session;
    },
  },
};
