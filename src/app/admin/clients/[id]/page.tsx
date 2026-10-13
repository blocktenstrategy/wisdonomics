import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, intakes, users } from "@/db";
import { Engine } from "@/components/Engine";
import { ReportUploader } from "@/components/ReportUploader";
import { statusOf } from "@/lib/status";
import { releaseResults, hideResults, removeReport, reopenIntake } from "./actions";

export const dynamic = "force-dynamic";

const when = (d: Date | null | undefined) =>
  d ? d.toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;
const mb = (n: number | null | undefined) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : "");

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.isAdmin) redirect("/intake");

  const { id } = await params;
  const { ok, err } = await searchParams;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();
  const [row] = await db.select().from(intakes).where(eq(intakes.userId, id)).limit(1);
  const data = (row?.data as Record<string, any>) ?? {};
  const name = data?.client?.name || user.name || user.email || "this client";
  const q = `?user=${encodeURIComponent(id)}`;
  const hasFramework = !!data.framework;
  const canRelease = hasFramework || !!row?.reportUrl;

  const panel = (
    <section className="review" aria-label="Review and results">
      <div className="review-head">
        <div>
          <span className="eyebrow">Review and results</span>
          <h2>{name}</h2>
          <p className="muted">{user.email}</p>
        </div>
        {(ok || err) && <p className={`adm-msg${err ? " err" : ""}`} role={err ? "alert" : "status"}>{err || ok}</p>}
      </div>

      <ol className="review-steps">
        <li className={row?.submittedAt ? "done" : ""}>
          <b>1. Submitted</b>
          <span>{row?.submittedAt ? `On ${when(row.submittedAt)}` : "Not yet. The client is still working on it."}</span>
          {row?.submittedAt && !row.releasedAt && (
            <form action={reopenIntake}>
              <input type="hidden" name="userId" value={id} />
              <button className="linkbtn" type="submit">Reopen for edits</button>
            </form>
          )}
        </li>

        <li className={hasFramework ? "done" : ""}>
          <b>2. Interactive results</b>
          <span>
            {hasFramework
              ? `Framework added ${when(new Date(data.framework.generatedAt || Date.now()))}. Preview it in the Submit step below.`
              : "Not added yet. In Claude Code, ask for this client's CEO framework (by email) and it will be saved here."}
          </span>
        </li>

        <li className={row?.reportUrl ? "done" : ""}>
          <b>3. Designed PDF report</b>
          <span>
            {row?.reportUrl ? (
              <>
                <a href={`/api/report${q}`}>{row.reportName}</a> · {mb(row.reportSize)} · uploaded {when(row.reportUploadedAt)}
              </>
            ) : (
              "No PDF yet. Tip: the PDF button on the results preview exports a designed version you can upload or polish first."
            )}
          </span>
          <div className="review-actions">
            <ReportUploader userId={id} hasReport={!!row?.reportUrl} />
            {row?.reportUrl && (
              <form action={removeReport}>
                <input type="hidden" name="userId" value={id} />
                <button className="linkbtn" type="submit">Remove PDF</button>
              </form>
            )}
          </div>
        </li>

        <li className={row?.releasedAt ? "done" : ""}>
          <b>4. Send to client</b>
          {row?.releasedAt ? (
            <>
              <span>Sent {when(row.releasedAt)}. The client can see their results and download the report.</span>
              <form action={hideResults}>
                <input type="hidden" name="userId" value={id} />
                <button className="linkbtn" type="submit">Hide from client</button>
              </form>
            </>
          ) : (
            <>
              <span>{canRelease ? "Ready when you are. The client sees nothing until you send it." : "Add the framework or upload a PDF first."}</span>
              <form action={releaseResults} className="review-actions">
                <input type="hidden" name="userId" value={id} />
                <label className="check">
                  <input type="checkbox" name="notify" defaultChecked /> Email them that it's ready
                </label>
                <button className="btn primary" type="submit" disabled={!canRelease}>
                  Send results
                </button>
              </form>
            </>
          )}
        </li>
      </ol>
    </section>
  );

  return (
    <Engine
      init={{
        userId: id,
        intake: data,
        intakeUrl: `/api/intake${q}`,
        submitUrl: `/api/submit${q}`,
        reportUrl: `/api/report${q}`,
        admin: true,
        status: statusOf(row),
      }}
      email={session.user.email ?? ""}
      isAdmin
      viewing={{ name }}
      adminPanel={panel}
    />
  );
}
