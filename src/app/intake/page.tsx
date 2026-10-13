import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, intakes } from "@/db";
import { Engine } from "@/components/Engine";
import { statusOf } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [row] = await getDb().select().from(intakes).where(eq(intakes.userId, session.user.id)).limit(1);

  return (
    <Engine
      init={{
        userId: session.user.id,
        intake: (row?.data as Record<string, unknown>) ?? {},
        intakeUrl: "/api/intake",
        submitUrl: "/api/submit",
        reportUrl: "/api/report",
        admin: false,
        status: statusOf(row),
      }}
      email={session.user.email ?? ""}
      isAdmin={session.user.isAdmin}
    />
  );
}
