import { eq, sql } from "drizzle-orm";
import { getDb, frameworks } from "@/db";

/** How many times this client has run the framework. */
export async function runsUsed(userId: string): Promise<number> {
  const [{ n }] = await getDb().select({ n: sql<number>`count(*)::int` }).from(frameworks).where(eq(frameworks.userId, userId));
  return n;
}

/** How many times a client can run the framework in total (MAX_RUNS, default 3). Admins aren't limited. */
export function maxRuns(): number {
  const n = Number(process.env.MAX_RUNS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}
