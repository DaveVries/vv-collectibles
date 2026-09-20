import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth treats a missing secret as a soft failure in production: sign-in
 * returns 200, no session cookie is issued, and the user silently bounces
 * back to the login page. An env var set to "" reads as missing, which is
 * easy to do in a hosting dashboard, so say so loudly in the logs rather
 * than leaving it to be guessed from the redirect loop.
 *
 * Warn, never throw: this module is imported during prerendering, and
 * throwing here would fail the build instead of the request.
 */
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  console.error(
    "[auth] NEXTAUTH_SECRET is missing or empty. Sign-in will appear to " +
      "succeed but no session will be created. Set it and redeploy.",
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.sub as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}
