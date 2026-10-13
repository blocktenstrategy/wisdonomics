import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { getDb, intakes } from "@/db";
import { resolveTarget } from "@/lib/target";

/**
 * Downloads the designed PDF report. The file is private in Blob storage and is streamed through here,
 * so only the client (once results are sent) and admins can get it.
 */
export async function GET(req: Request) {
  const target = await resolveTarget(req);
  if (!target) return NextResponse.redirect(new URL("/login", req.url));

  const [row] = await getDb().select().from(intakes).where(eq(intakes.userId, target.userId)).limit(1);
  if (!row?.reportUrl || (!target.isAdmin && !row.releasedAt)) {
    return NextResponse.json({ error: "No report yet." }, { status: 404 });
  }

  const file = await get(row.reportUrl, { access: "private" });
  if (!file || file.statusCode !== 200) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const name = (row.reportName || "CEO-Framework.pdf").replace(/[^\w.\- ]+/g, "_");
  return new Response(file.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      ...(file.blob.size ? { "Content-Length": String(file.blob.size) } : {}),
    },
  });
}
