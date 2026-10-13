import { eq } from "drizzle-orm";
import { getDb, invites } from "@/db";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

/** Invite-only: admins plus anyone on the invite list. */
export async function isAllowedEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (isAdminEmail(e)) return true;
  const rows = await getDb().select({ email: invites.email }).from(invites).where(eq(invites.email, e)).limit(1);
  return rows.length > 0;
}

export function appUrl(fallback?: string | null): string {
  return (process.env.APP_URL || fallback || "http://localhost:3000").replace(/\/$/, "");
}
