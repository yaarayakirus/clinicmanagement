import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
    }),
  ],
  callbacks: {
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
