import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, intakes } from "@/db";
import { Engine } from "@/components/Engine";
import { runsUsed, maxRuns } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [[row], used] = await Promise.all([
    getDb().select().from(intakes).where(eq(intakes.userId, session.user.id)).limit(1),
    runsUsed(session.user.id),
  ]);

  return (
    <Engine
      init={{
        userId: session.user.id,
        intake: (row?.data as Record<string, unknown>) ?? {},
        intakeUrl: "/api/intake",
        generateUrl: "/api/generate",
        runsUsed: used,
        maxRuns: session.user.isAdmin ? null : maxRuns(),
      }}
      email={session.user.email ?? ""}
      isAdmin={session.user.isAdmin}
    />
  );
}
