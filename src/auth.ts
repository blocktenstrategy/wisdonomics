import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb, users, accounts, sessions, verificationTokens } from "@/db";
import { isAllowedEmail, isAdminEmail } from "@/lib/access";
import { sendMagicLink, resendKey } from "@/lib/email";

declare module "next-auth" {
  interface Session {
    user: { id: string; isAdmin: boolean } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: resendKey(),
      from: process.env.AUTH_EMAIL_FROM,
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLink(identifier, url);
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    // Invite-only: block the email from being sent to anyone not on the list.
    async signIn({ user }) {
      if (await isAllowedEmail(user.email)) return true;
      return "/login?error=NotInvited";
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.isAdmin = isAdminEmail(user.email);
      return session;
    },
  },
  trustHost: true,
}));
