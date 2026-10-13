import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, invites, users, intakes } from "@/db";
import { addInvite, removeInvite } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  email: string;
  name: string | null;
  userId: string | null;
  invitedAt: Date | null;
  status: "invited" | "new" | "progress" | "ready";
  minutes: number | null;
  updated: Date | null;
  score: number | null;
};

function minutesOf(d: Record<string, any>): number | null {
  if (!d.startedAt) return null;
  return Math.max(0, Math.round(((d.finishedAt || Date.now()) - d.startedAt) / 60000));
}

/** Overall trust score, same math as the results page (draft offer). */
function scoreOf(f: any): number | null {
  if (!f || f.v !== 2) return null;
  const sum = (s: any[], k: string) => (s ?? []).reduce((n: number, x: any) => n + (Number(x[k]) || 0), 0);
  const c = f.customer?.signals ?? [], e = f.edge?.signals ?? [], o = f.offer?.signals ?? [];
  const max = (c.length + e.length + o.length) * 2;
  return max ? Math.round(((sum(c, "score") + sum(e, "score") + sum(o, "draft")) / max) * 100) : null;
}

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en", { month: "short", day: "numeric" }) : "—");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isAdmin) redirect("/intake");
  const { ok, err } = await searchParams;

  const db = getDb();
  const [inv, us, ins] = await Promise.all([
    db.select().from(invites).orderBy(desc(invites.invitedAt)),
    db.select().from(users),
    db.select().from(intakes),
  ]);
  const userByEmail = new Map(us.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]));
  const intakeByUser = new Map(ins.map((i) => [i.userId, i]));

  const emails = new Set<string>([...inv.map((i) => i.email), ...us.filter((u) => u.email && intakeByUser.has(u.id)).map((u) => u.email!.toLowerCase())]);
  const rows: Row[] = [...emails].map((email) => {
    const i = inv.find((x) => x.email === email);
    const u = userByEmail.get(email);
    const intake = u ? intakeByUser.get(u.id) : undefined;
    const d = (intake?.data ?? {}) as Record<string, any>;
    const status: Row["status"] = !u ? "invited" : d.framework ? "ready" : d.startedAt ? "progress" : "new";
    return {
      email,
      name: d.client?.name || i?.name || u?.name || null,
      userId: u?.id ?? null,
      invitedAt: i?.invitedAt ?? null,
      status,
      minutes: minutesOf(d),
      updated: intake?.updatedAt ?? null,
      score: scoreOf(d.framework),
    };
  });
  rows.sort((a, b) => (b.updated?.getTime() ?? b.invitedAt?.getTime() ?? 0) - (a.updated?.getTime() ?? a.invitedAt?.getTime() ?? 0));

  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  const LABEL = { invited: "Invited", new: "Signed in", progress: "In progress", ready: "Framework ready" } as const;

  return (
    <>
      <div className="glow a" aria-hidden="true" />
      <div className="glow b" aria-hidden="true" />
      <main className="adm">
        <div className="adm-top">
          <div>
            <div className="brand">
              <img src="/logo.png" alt="" width={34} height={34} />
              <span>Block Ten Strategy</span>
            </div>
            <h1>Clients</h1>
          </div>
          <div className="acct">
            <a className="btn" href="/intake">My own intake</a>
            <span className="who">{session.user.email}</span>
            <form method="post" action="/api/signout">
              <button className="btn" type="submit">Sign out</button>
            </form>
          </div>
        </div>

        <div className="adm-stats">
          <div className="adm-stat"><span>Invited</span><b>{rows.length}</b></div>
          <div className="adm-stat"><span>Not signed in yet</span><b>{count("invited")}</b></div>
          <div className="adm-stat"><span>In progress</span><b>{count("progress") + count("new")}</b></div>
          <div className="adm-stat"><span>Framework ready</span><b>{count("ready")}</b></div>
        </div>

        <form className="adm-invite" action={addInvite}>
          <div>
            <label htmlFor="inv-email">Client email</label>
            <input id="inv-email" name="email" type="email" required placeholder="client@company.com" />
          </div>
          <div>
            <label htmlFor="inv-name">Name (optional)</label>
            <input id="inv-name" name="name" type="text" placeholder="Rissa Salido" />
          </div>
          <button className="btn primary" type="submit">Invite</button>
          <label className="check" htmlFor="inv-notify">
            <input id="inv-notify" name="notify" type="checkbox" defaultChecked /> Send them an invite email now
          </label>
        </form>
        {ok && <p className="adm-msg" role="status">{ok}</p>}
        {err && <p className="adm-msg err" role="alert">{err}</p>}

        <div className="adm-table">
          {rows.length === 0 ? (
            <p className="adm-empty">No clients yet. Invite your first one above.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Client</th><th>Status</th><th>Trust score</th><th>Time spent</th><th>Last active</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email}>
                    <td className="k">
                      {r.userId ? <a href={`/admin/clients/${r.userId}`}>{r.name || r.email}</a> : r.name || r.email}
                      <small>{r.email}</small>
                    </td>
                    <td><span className={`st ${r.status}`}>{LABEL[r.status]}</span></td>
                    <td className="num">{r.score ?? "—"}</td>
                    <td className="num">{r.minutes == null ? "—" : `${r.minutes} min`}</td>
                    <td className="num">{fmt(r.updated ?? r.invitedAt)}</td>
                    <td>
                      {r.invitedAt && (
                        <form action={removeInvite}>
                          <input type="hidden" name="email" value={r.email} />
                          <button className="linkbtn" type="submit" title="They can no longer sign in. Their answers are kept.">Remove access</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
