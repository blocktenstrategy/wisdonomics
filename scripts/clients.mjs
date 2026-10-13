#!/usr/bin/env node
// Block Ten's working tool for building frameworks in Claude Code.
//
//   npm run clients -- list                          Submitted intakes waiting for a framework
//   npm run clients -- pull <email> [out.json]       Save a client's answers to a file
//   npm run clients -- push <email> <framework.json> Save a framework (v2 shape) to the client
//
// Reads DATABASE_URL from .env.local (run `vercel env pull .env.local` once).
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Run: vercel env pull .env.local");
  process.exit(1);
}
const sql = neon(url);
const [cmd, email, file] = process.argv.slice(2);

async function userByEmail(e) {
  const rows = await sql`select u.id, u.email, i.data, i."submittedAt", i."releasedAt" from "user" u left join intake i on i."userId" = u.id where lower(u.email) = lower(${e}) limit 1`;
  if (!rows.length) throw new Error(`No signed-in user with email ${e}. They need to sign in once first.`);
  return rows[0];
}

function checkFramework(f) {
  const need = ["customer", "edge", "offer", "overview"];
  const missing = need.filter((k) => !f || typeof f[k] !== "object");
  if (missing.length) throw new Error(`Framework is missing: ${missing.join(", ")}`);
  for (const k of ["customer", "edge"]) if (!Array.isArray(f[k].signals)) throw new Error(`${k}.signals must be an array`);
  if (!Array.isArray(f.offer.signals) || f.offer.signals.some((s) => s.draft == null || s.sharp == null)) throw new Error("offer.signals need draft and sharp scores");
  return { v: 2, generatedAt: Date.now(), gaps: [], ...f };
}

try {
  if (cmd === "list") {
    const rows = await sql`select u.email, i.data->'client'->>'name' as name, i."submittedAt", i."releasedAt", (i.data ? 'framework' and i.data->'framework' <> 'null'::jsonb) as has_framework, i."reportUrl" is not null as has_report from intake i join "user" u on u.id = i."userId" where i."submittedAt" is not null order by i."releasedAt" nulls first, i."submittedAt"`;
    if (!rows.length) console.log("No submitted intakes yet.");
    for (const r of rows) {
      const state = r.releasedAt ? "sent" : r.has_framework ? "framework added, not sent" : "needs framework";
      console.log(`${r.email}\t${r.name ?? ""}\tsubmitted ${new Date(r.submittedAt).toISOString().slice(0, 10)}\t${state}${r.has_report ? " · PDF uploaded" : ""}`);
    }
  } else if (cmd === "pull" && email) {
    const u = await userByEmail(email);
    if (!u.data) throw new Error("This client hasn't started their intake.");
    const { framework, ...answers } = u.data;
    const out = JSON.stringify(answers, null, 2);
    if (file) {
      writeFileSync(file, out);
      console.log(`Saved ${email}'s answers to ${file}`);
    } else console.log(out);
  } else if (cmd === "push" && email && file) {
    const u = await userByEmail(email);
    const fw = checkFramework(JSON.parse(readFileSync(file, "utf8")));
    await sql`update intake set data = data || jsonb_build_object('framework', ${JSON.stringify(fw)}::jsonb), "updatedAt" = now() where "userId" = ${u.id}`;
    await sql`insert into framework ("userId", data) values (${u.id}, ${JSON.stringify(fw)}::jsonb)`;
    console.log(`Saved the framework for ${email}. Preview it on their admin page, then click Send results.`);
  } else {
    console.log("Usage: npm run clients -- list | pull <email> [out.json] | push <email> <framework.json>");
    process.exit(1);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
