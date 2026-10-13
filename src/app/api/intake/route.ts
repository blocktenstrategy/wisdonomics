import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, intakes } from "@/db";
import { resolveTarget } from "@/lib/target";

const MAX_BYTES = 300_000;

/** Saves the intake form. The framework is owned by the server, so it is never taken from the client. */
export async function PUT(req: Request) {
  const target = await resolveTarget(req);
  if (!target) return NextResponse.json({ error: "Sign in again to keep saving." }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "That's more text than we can save at once." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }
  delete body.framework;

  // Merge onto what's stored so the saved framework survives every autosave.
  await getDb()
    .insert(intakes)
    .values({ userId: target.userId, data: body, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: intakes.userId,
      set: {
        data: sql`${JSON.stringify(body)}::jsonb || jsonb_build_object('framework', ${intakes.data}->'framework')`,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
