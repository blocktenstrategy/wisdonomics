"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb, intakes, users } from "@/db";
import { appUrl } from "@/lib/access";
import { sendResultsReady } from "@/lib/email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/login");
}

const back = (id: string, msg: string, err = false) => redirect(`/admin/clients/${id}?${err ? "err" : "ok"}=${encodeURIComponent(msg)}`);

/** Called by the uploader after the PDF lands in Blob storage. */
export async function attachReport(userId: string, url: string, name: string, size: number) {
  await requireAdmin();
  const host = new URL(url).hostname;
  if (!host.endsWith(".blob.vercel-storage.com")) throw new Error("Unexpected file location.");

  const db = getDb();
  const [row] = await db.select({ reportUrl: intakes.reportUrl }).from(intakes).where(eq(intakes.userId, userId)).limit(1);
  const values = { reportUrl: url, reportName: name, reportSize: size, reportUploadedAt: new Date() };
  await db.insert(intakes).values({ userId, data: {}, ...values }).onConflictDoUpdate({ target: intakes.userId, set: values });
  if (row?.reportUrl && row.reportUrl !== url) await del(row.reportUrl).catch(() => {});
  revalidatePath(`/admin/clients/${userId}`);
}

export async function removeReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("userId"));
  const db = getDb();
  const [row] = await db.select({ reportUrl: intakes.reportUrl }).from(intakes).where(eq(intakes.userId, id)).limit(1);
  await db.update(intakes).set({ reportUrl: null, reportName: null, reportSize: null, reportUploadedAt: null }).where(eq(intakes.userId, id));
  if (row?.reportUrl) await del(row.reportUrl).catch(() => {});
  back(id, "Report removed.");
}

export async function releaseResults(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("userId"));
  const notify = formData.get("notify") === "on";
  const db = getDb();
  const [row] = await db.select().from(intakes).where(eq(intakes.userId, id)).limit(1);
  const data = (row?.data ?? {}) as Record<string, any>;
  if (!row || (!row.reportUrl && !data.framework)) back(id, "Add the framework or upload a report first.", true);

  await db.update(intakes).set({ releasedAt: new Date() }).where(eq(intakes.userId, id));
  if (notify) {
    const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    try {
      const origin = (await headers()).get("origin");
      if (u?.email) await sendResultsReady(u.email, data?.client?.name || u.name || null, `${appUrl(origin)}/intake`);
    } catch (e) {
      console.error("results email failed", e);
      back(id, "Results are visible to the client, but the email didn't send. Check your Resend settings.", true);
    }
  }
  back(id, notify ? "Results sent. The client has been emailed." : "Results are now visible to the client.");
}

export async function hideResults(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("userId"));
  await getDb().update(intakes).set({ releasedAt: null }).where(eq(intakes.userId, id));
  back(id, "Results hidden from the client.");
}

export async function reopenIntake(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("userId"));
  await getDb().update(intakes).set({ submittedAt: null }).where(eq(intakes.userId, id));
  back(id, "Submission reopened. The client can submit again.");
}
