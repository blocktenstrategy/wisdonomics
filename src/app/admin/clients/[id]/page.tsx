import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, intakes, users } from "@/db";
import { Engine } from "@/components/Engine";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.isAdmin) redirect("/intake");

  const { id } = await params;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();
  const [row] = await db.select().from(intakes).where(eq(intakes.userId, id)).limit(1);
  const data = (row?.data as Record<string, any>) ?? {};
  const q = `?user=${encodeURIComponent(id)}`;

  return (
    <Engine
      init={{ userId: id, intake: data, intakeUrl: `/api/intake${q}`, generateUrl: `/api/generate${q}` }}
      email={session.user.email ?? ""}
      isAdmin
      viewing={{ name: data?.client?.name || user.name || user.email || "this client" }}
    />
  );
}
