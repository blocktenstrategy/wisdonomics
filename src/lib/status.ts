import type { intakes } from "@/db";

type IntakeRow = typeof intakes.$inferSelect;

/** What the engine needs to know about review and results, as plain numbers for the browser. */
export function statusOf(row?: IntakeRow | null) {
  return {
    submittedAt: row?.submittedAt?.getTime() ?? null,
    releasedAt: row?.releasedAt?.getTime() ?? null,
    report: row?.reportUrl ? { name: row.reportName ?? "Report.pdf", size: row.reportSize ?? null } : null,
  };
}
