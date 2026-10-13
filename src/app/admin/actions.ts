"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, invites, users, sessions } from "@/db";
import { appUrl } from "@/lib/access";
import { sendInvite } from "@/lib/email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/login");
  return session;
}

export async function addInvite(formData: FormData) {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const notify = formData.get("notify") === "on";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/admin?err=" + encodeURIComponent("Enter a valid email address."));

  await getDb()
    .insert(invites)
    .values({ email, name, invitedBy: session.user.email ?? null })
    .onConflictDoUpdate({ target: invites.email, set: { name } });

  if (notify) {
    try {
      const origin = (await headers()).get("origin");
      await sendInvite(email, name, `${appUrl(origin)}/login?email=${encodeURIComponent(email)}`);
    } catch (e) {
      console.error("invite email failed", e);
      redirect("/admin?err=" + encodeURIComponent(`${email} was added, but the invite email didn't send. Check your Resend settings.`));
    }
  }
  redirect("/admin?ok=" + encodeURIComponent(notify ? `Invite sent to ${email}.` : `${email} can now sign in.`));
}

export async function removeInvite(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email) {
    const db = getDb();
    await db.delete(invites).where(eq(invites.email, email));
    // End any open sessions so access stops now, not at the next sign-in.
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (u) await db.delete(sessions).where(eq(sessions.userId, u.id));
  }
  redirect("/admin?ok=" + encodeURIComponent(`${email} can no longer sign in. Their answers are kept.`));
}
