import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, intakes, users } from "@/db";
import { resolveTarget } from "@/lib/target";
import { adminEmails, appUrl } from "@/lib/access";
import { sendSubmittedNotice } from "@/lib/email";

/** "Submit for review": stamps the intake and emails the admins once. */
export async function POST(req: Request) {
  const target = await resolveTarget(req);
  if (!target) return NextResponse.json({ error: "Sign in again to submit." }, { status: 401 });

  const db = getDb();
  const [row] = await db.select().from(intakes).where(eq(intakes.userId, target.userId)).limit(1);
  if (!row) return NextResponse.json({ error: "Fill in your intake first." }, { status: 400 });
  if (row.submittedAt) return NextResponse.json({ submittedAt: row.submittedAt.getTime() });

  const submittedAt = new Date();
  await db.update(intakes).set({ submittedAt }).where(eq(intakes.userId, target.userId));

  try {
    const [u] = await db.select().from(users).where(eq(users.id, target.userId)).limit(1);
    const data = row.data as Record<string, any>;
    const name = data?.client?.name || u?.name || u?.email || "A client";
    await sendSubmittedNotice(adminEmails(), name, u?.email ?? "", `${appUrl(new URL(req.url).origin)}/admin/clients/${target.userId}`);
  } catch (e) {
    console.error("submission email failed", e);
  }

  return NextResponse.json({ submittedAt: submittedAt.getTime() });
}
