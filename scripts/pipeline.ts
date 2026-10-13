/**
 * The WISDONOMICS framework pipeline, run by the scheduled Claude Code routine (and by hand).
 *
 *   npm run pipeline -- pending                              Submissions waiting for a framework (JSON)
 *   npm run pipeline -- brief <email> [brief.md]             Everything needed to write framework.json
 *   npm run pipeline -- score <framework.json>               Scores and verdicts for a draft
 *   npm run pipeline -- overview-brief <email> <framework.json>   Instructions for the "overview" part
 *   npm run pipeline -- publish <email> <framework.json>     Save, render PDF, upload, send, email
 *   npm run pipeline -- render <framework.json> <out.pdf> [--name "Client" --brand "Brand"]   PDF only, no database
 *   npm run pipeline -- fail <email> "<reason>"              Email the admins that a build failed
 *
 * Settings come from the environment, or from .env.local when present (vercel env pull .env.local):
 * DATABASE_URL, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY, AUTH_EMAIL_FROM, ADMIN_EMAILS, APP_URL.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { getDb, intakes, users, frameworks } from "../src/db/index";
import { promptFor, overviewPrompt, BASE_RULES, RUBRIC, intakeJSON } from "../src/lib/prompts";
import { tally, type Signal } from "../src/lib/scoring";
import { sendResultsReady, sendAdminNotice } from "../src/lib/email";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const ROOT = process.cwd(); // npm runs scripts from the project folder
const PARTS = ["customer", "edge", "offer"] as const;
const admins = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
const appUrl = () => (process.env.APP_URL || "").replace(/\/$/, "");
const slug = (s: string) => (s || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "client";

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function client(email: string) {
  const db = getDb();
  const [u] = await db.select().from(users).where(sql`lower(${users.email}) = lower(${email})`).limit(1);
  if (!u) die(`No user with email ${email}.`);
  const [row] = await db.select().from(intakes).where(eq(intakes.userId, u.id)).limit(1);
  if (!row) die(`${email} hasn't started their intake.`);
  return { user: u, row, data: row.data as Record<string, any> };
}

// ---------- scoring ----------
function scores(f: any) {
  const c = tally((f.customer?.signals ?? []) as Signal[], "score");
  const e = tally((f.edge?.signals ?? []) as Signal[], "score");
  const o = tally((f.offer?.signals ?? []) as Signal[], "draft");
  const os = tally((f.offer?.signals ?? []) as Signal[], "sharp");
  const max = c.max + e.max + o.max;
  return { c, e, o, os, overall: max ? Math.round(((c.pts + e.pts + o.pts) / max) * 100) : 0 };
}

/** Checks the framework file has everything the results page needs, and fills derived fields. */
function validate(raw: any) {
  const problems: string[] = [];
  for (const k of [...PARTS, "overview"]) if (!raw?.[k] || typeof raw[k] !== "object") problems.push(`missing "${k}"`);
  if (!problems.length) {
    if (!Array.isArray(raw.customer.signals) || raw.customer.signals.length !== 5) problems.push("customer.signals must have C1-C5");
    if (!Array.isArray(raw.edge.signals) || raw.edge.signals.length !== 6) problems.push("edge.signals must have E1-E6");
    if (!Array.isArray(raw.offer.signals) || raw.offer.signals.length !== 7) problems.push("offer.signals must have O1-O7");
    else if (raw.offer.signals.some((s: any) => s.draft == null || s.sharp == null)) problems.push("offer.signals need draft and sharp");
    for (const p of PARTS) if (!raw[p].oneLine) problems.push(`${p}.oneLine is empty`);
    if (!raw.overview.positioning || !raw.overview.leak) problems.push("overview needs positioning and leak");
  }
  if (problems.length) die(`framework.json isn't ready: ${problems.join("; ")}`);
  const gaps = Array.isArray(raw.gaps) && raw.gaps.length ? raw.gaps : [...(raw.customer.gaps ?? []), ...(raw.edge.gaps ?? []), ...(raw.offer.gaps ?? [])];
  return { ...raw, v: 2, generatedAt: Date.now(), gaps };
}

// ---------- PDF ----------
const PRINT_CSS = `
@page{size:1000px 1414px}
html,body{background:#000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wrap{max-width:none!important;padding:0 40px!important}
.wrap > :not(#results){display:none!important}
#results{margin:0!important;padding:0!important;border:0!important}
#results .topbar,#results .pdf-status,#results [data-pdf-skip],.rtip{display:none!important}
#results [data-pdf]{break-inside:avoid}
#results [data-pdf-break]{break-before:page}
#results .chapter{margin-top:32px}
#results *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:none!important;animation:none!important}
#results .glasscard,#results .overall,#results .pk{background:#110d14!important}
`;
// Paints the header/footer margin black (slightly taller than the margin so no seam shows).
const band = (inner: string, h: number, top: boolean) =>
  `<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;position:absolute;left:0;right:0;${top ? "top" : "bottom"}:0;height:${h + 4}px;background:#000;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;justify-content:space-between;padding:0 40px;box-sizing:border-box">${inner}</div>`;

export async function renderPdf(intake: Record<string, any>, framework: any, out: string) {
  const { chromium } = await import("playwright");
  const css = readFileSync(join(ROOT, "src/app/engine.css"), "utf8") + readFileSync(join(ROOT, "src/app/app.css"), "utf8") + PRINT_CSS;
  const js = readFileSync(join(ROOT, "public/engine.js"), "utf8");
  const init = {
    userId: "print",
    intake: { ...intake, committed: true, framework },
    intakeUrl: "about:blank",
    submitUrl: "about:blank",
    reportUrl: "#",
    admin: true,
    forceStep: "gen",
    status: { submittedAt: Date.now(), releasedAt: Date.now(), report: null },
  };
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap">
<style>${css}</style></head><body>
<div class="wrap"><span id="status"></span><span id="timer" hidden></span><nav id="rail"></nav><main id="main"></main><section class="res" id="results" hidden></section></div>
<script id="wde-init" type="application/json">${JSON.stringify(init).replace(/</g, "\\u003c")}</script>
<script>${js}</script></body></html>`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1414 } });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector("#results:not([hidden]) #r-overview", { timeout: 15000 });
    const name = String(intake?.client?.name || "Your brand").replace(/[<&>]/g, "");
    await page.pdf({
      path: out,
      width: "1000px",
      height: "1414px",
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: "56px", bottom: "48px", left: "0", right: "0" },
      headerTemplate: band(`<span style="color:#fff;font-weight:700">Block Ten Strategy</span><span style="color:#BF7BCB;font-weight:700">CEO Framework · ${name}</span>`, 56, true),
      footerTemplate: band(`<span style="color:#8c8492;text-transform:none;letter-spacing:0">blocktenstrategy.com</span><span style="color:#8c8492;letter-spacing:0"><span class="pageNumber"></span> / <span class="totalPages"></span></span>`, 48, false),
    });
  } finally {
    await browser.close();
  }
}

// ---------- commands ----------
const [cmd, ...args] = process.argv.slice(2);

async function main() {
  if (cmd === "pending") {
    const db = getDb();
    const rows = await db
      .select({ email: users.email, data: intakes.data, submittedAt: intakes.submittedAt })
      .from(intakes)
      .innerJoin(users, eq(users.id, intakes.userId))
      .where(and(isNotNull(intakes.submittedAt), isNull(intakes.releasedAt)));
    const waiting = rows
      .filter((r) => {
        const f = (r.data as any)?.framework;
        return !f || Number(f.generatedAt) < r.submittedAt!.getTime();
      })
      .map((r) => ({ email: r.email, name: (r.data as any)?.client?.name ?? null, submittedAt: r.submittedAt!.toISOString() }));
    console.log(JSON.stringify(waiting, null, 2));
    return;
  }

  if (cmd === "brief") {
    const [email, out] = args;
    if (!email) die("Usage: brief <email> [brief.md]");
    const { data } = await client(email);
    const head = `${BASE_RULES}\n\nRUBRIC\n${RUBRIC}\n\nINTAKE (JSON)\n${intakeJSON(data)}\n\n`;
    const tail = (p: (typeof PARTS)[number]) => {
      const full = promptFor(p, data)!;
      return full.startsWith(head) ? full.slice(head.length) : full;
    };
    const text = `# Build the CEO framework for ${data?.client?.name || email}

You are writing **framework.json** for the WISDONOMICS Engine. Work like a senior brand strategist at Block Ten Strategy.
If the wisdonomics-engine skill is available, use its judgment, but the JSON format below is mandatory.

framework.json is one object: { "customer": {...}, "edge": {...}, "offer": {...}, "overview": {...} }.
Write each part exactly as its section below specifies (each says "Return ONLY JSON": that JSON is the value for that key).

## Rules, rubric and the client's intake
${head}
## Part 1: "customer"
${tail("customer")}

## Part 2: "edge"
${tail("edge")}

## Part 3: "offer"
${tail("offer")}

## Part 4: "overview"
After writing parts 1-3 to framework.json (use "overview": {} for now), run:
  npm run pipeline -- overview-brief ${email} framework.json
and write the JSON it asks for as "overview". Then run:
  npm run pipeline -- score framework.json
to check the scores, and finally:
  npm run pipeline -- publish ${email} framework.json
`;
    if (out) {
      writeFileSync(out, text);
      console.log(`Brief written to ${out}`);
    } else console.log(text);
    return;
  }

  if (cmd === "score") {
    const [file] = args;
    if (!file) die("Usage: score <framework.json>");
    const f = JSON.parse(readFileSync(file, "utf8"));
    const s = scores(f);
    console.log(
      `Customer ${s.c.pct} (${s.c.v}) · Edge ${s.e.pct} (${s.e.v}) · Offer ${s.o.pct} (${s.o.v}) → sharpened ${s.os.pct} (${s.os.v}) · Trust score ${s.overall}`,
    );
    return;
  }

  if (cmd === "overview-brief") {
    const [email, file] = args;
    if (!email || !file) die("Usage: overview-brief <email> <framework.json>");
    const { data } = await client(email);
    const f = JSON.parse(readFileSync(file, "utf8"));
    const s = scores(f);
    const c = { f: f.customer, ...s.c }, e = { f: f.edge, ...s.e }, o: any = { f: f.offer, ...s.o, sharpPct: s.os.pct };
    const gaps = [...(f.customer?.gaps ?? []), ...(f.edge?.gaps ?? []), ...(f.offer?.gaps ?? [])];
    console.log(overviewPrompt(data, c, e, o, gaps));
    return;
  }

  if (cmd === "render") {
    const [file, out] = args;
    if (!file || !out) die('Usage: render <framework.json> <out.pdf> [--name "Client" --brand "Brand"]');
    const opt = (k: string) => {
      const i = args.indexOf(k);
      return i > -1 ? args[i + 1] : "";
    };
    const f = validate(JSON.parse(readFileSync(file, "utf8")));
    await renderPdf({ client: { name: opt("--name") || "Client", brand: opt("--brand") } }, f, out);
    console.log(`PDF written to ${out}`);
    return;
  }

  if (cmd === "publish") {
    const [email, file] = args;
    if (!email || !file) die("Usage: publish <email> <framework.json>");
    const { user, row, data } = await client(email);
    if (!row.submittedAt) die(`${email} hasn't submitted their intake.`);
    const framework = validate(JSON.parse(readFileSync(file, "utf8")));
    const db = getDb();

    // 1. Save the framework (and keep a copy in the history).
    await db
      .update(intakes)
      .set({ data: sql`${intakes.data} || jsonb_build_object('framework', ${JSON.stringify(framework)}::jsonb)`, updatedAt: new Date() })
      .where(eq(intakes.userId, user.id));
    await db.insert(frameworks).values({ userId: user.id, data: framework });

    // 2. Render and upload the designed PDF (private).
    const name = data?.client?.name || user.name || "Client";
    const pdfPath = join(process.env.TMPDIR || "/tmp", `CEO-Framework-${slug(name)}.pdf`);
    await renderPdf(data, framework, pdfPath);
    const pdf = readFileSync(pdfPath);
    const blob = await put(`reports/${user.id}/CEO-Framework-${slug(name)}.pdf`, pdf, {
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });
    if (row.reportUrl && row.reportUrl !== blob.url) await del(row.reportUrl).catch(() => {});

    // 3. Release to the client.
    await db
      .update(intakes)
      .set({
        reportUrl: blob.url,
        reportName: `CEO-Framework-${slug(name)}.pdf`,
        reportSize: pdf.length,
        reportUploadedAt: new Date(),
        releasedAt: new Date(),
      })
      .where(eq(intakes.userId, user.id));

    // 4. Email the client, then tell the admins.
    const s = scores(framework);
    await sendResultsReady(user.email!, data?.client?.name || user.name || null, `${appUrl()}/intake`);
    await sendAdminNotice(
      admins(),
      `Results sent to ${name}`,
      `The routine built ${name}'s CEO framework and emailed it to ${user.email}.\nTrust score ${s.overall}: Customer ${s.c.pct}, Edge ${s.e.pct}, Offer ${s.o.pct} (${s.os.pct} sharpened).`,
      { href: `${appUrl()}/admin/clients/${user.id}`, label: "See what they received" },
    ).catch((e) => console.error("admin notice failed:", e.message));

    console.log(`Published ${email}: trust score ${s.overall}, PDF ${(pdf.length / 1024 / 1024).toFixed(1)} MB, client emailed.`);
    return;
  }

  if (cmd === "fail") {
    const [email, ...reason] = args;
    if (!email) die('Usage: fail <email> "<reason>"');
    await sendAdminNotice(admins(), `Couldn't build a framework for ${email}`, `The routine skipped ${email}: ${reason.join(" ") || "no reason given"}.\nTheir submission is still waiting; it will be retried on the next run.`);
    console.log("Admins notified.");
    return;
  }

  console.log("Usage: npm run pipeline -- pending | brief | score | overview-brief | publish | render | fail  (see scripts/pipeline.ts)");
  process.exit(1);
}

main().catch((e) => die(e instanceof Error ? e.message : String(e)));
