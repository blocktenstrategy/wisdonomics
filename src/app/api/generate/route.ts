import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { generateText } from "ai";
import { getDb, intakes, frameworks } from "@/db";
import { resolveTarget } from "@/lib/target";
import { promptFor, overviewPrompt } from "@/lib/prompts";
import { tally, type Signal } from "@/lib/scoring";

// Each call is one model request; give it room on Vercel.
export const maxDuration = 300;

type Part = "customer" | "edge" | "offer";
const PARTS: Part[] = ["customer", "edge", "offer"];

function model() {
  return process.env.AI_MODEL || "anthropic/claude-sonnet-5-5";
}

/** Pulls the JSON object out of a model reply, tolerating code fences or stray text. */
function parseJson(text: string): Record<string, any> {
  const t = text.replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no json");
  return JSON.parse(t.slice(a, b + 1));
}

async function ask(prompt: string, maxOutputTokens: number) {
  let last: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await generateText({ model: model(), prompt, maxOutputTokens });
      return parseJson(text);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/**
 * POST { part: "customer" | "edge" | "offer" | "overview" }
 * The three pillar parts run in parallel from the page; "overview" then combines them and saves the framework.
 */
export async function POST(req: Request) {
  const target = await resolveTarget(req);
  if (!target) return NextResponse.json({ error: "Sign in again to generate." }, { status: 401 });

  const { part } = (await req.json().catch(() => ({}))) as { part?: string };
  const db = getDb();
  const [row] = await db.select().from(intakes).where(eq(intakes.userId, target.userId)).limit(1);
  if (!row) return NextResponse.json({ error: "Fill in your intake first." }, { status: 400 });
  const intake = row.data as Record<string, any>;

  try {
    if (PARTS.includes(part as Part)) {
      const result = await ask(promptFor(part as Part, intake)!, 8000);
      // The three parts finish at different times, so merge atomically in SQL rather than read-modify-write.
      await db
        .update(intakes)
        .set({ pending: sql`coalesce(${intakes.pending}, '{}'::jsonb) || jsonb_build_object(${part}::text, ${JSON.stringify(result)}::jsonb)` })
        .where(eq(intakes.userId, target.userId));
      return NextResponse.json({ ok: true });
    }

    if (part === "overview") {
      const pending = (row.pending ?? {}) as Record<string, any>;
      if (!PARTS.every((p) => pending[p])) return NextResponse.json({ error: "Some parts are missing. Generate again." }, { status: 409 });
      const cf = pending.customer, ef = pending.edge, of = pending.offer;
      const c = { f: cf, ...tally((cf.signals ?? []) as Signal[], "score") };
      const e = { f: ef, ...tally((ef.signals ?? []) as Signal[], "score") };
      const o: any = { f: of, ...tally((of.signals ?? []) as Signal[], "draft") };
      const os = tally((of.signals ?? []) as Signal[], "sharp");
      o.sharpPct = os.pct;
      const gaps = [...(cf.gaps ?? []), ...(ef.gaps ?? []), ...(of.gaps ?? [])];
      const overview = await ask(overviewPrompt(intake, c, e, o, gaps), 2000);

      const framework = { v: 2, generatedAt: Date.now(), customer: cf, edge: ef, offer: of, overview, gaps };
      const finishedAt = intake.finishedAt || Date.now();
      await db
        .update(intakes)
        .set({ data: { ...intake, framework, finishedAt }, pending: null, updatedAt: new Date() })
        .where(eq(intakes.userId, target.userId));
      await db.insert(frameworks).values({ userId: target.userId, data: framework });
      return NextResponse.json({ framework, finishedAt });
    }

    return NextResponse.json({ error: "Unknown part." }, { status: 400 });
  } catch (err) {
    console.error("generate failed", part, err);
    return NextResponse.json({ error: "The framework didn't come back complete. Try again in a moment." }, { status: 502 });
  }
}
