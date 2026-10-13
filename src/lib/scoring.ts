export type Signal = { id: string; name: string; gate?: boolean; score?: number; draft?: number; sharp?: number; evidence?: string };
export type Verdict = "Strong" | "Workable" | "Weak";
export type Tally = { pts: number; max: number; pct: number; v: Verdict };

/** Same rules the page uses: Strong = 80+ with every gate at 2; Weak = under 55 or any gate at 0. */
export function tally(sig: Signal[], key: "score" | "draft" | "sharp"): Tally {
  const max = sig.length * 2;
  const pts = sig.reduce((n, s) => n + (Number(s[key]) || 0), 0);
  const gates = sig.filter((s) => s.gate).map((s) => Number(s[key]) || 0);
  const pct = max ? Math.round((pts / max) * 100) : 0;
  const gmin = gates.length ? Math.min(...gates) : 2;
  const v: Verdict = gmin === 0 || pct < 55 ? "Weak" : pct >= 80 && gmin === 2 ? "Strong" : "Workable";
  return { pts, max, pct, v };
}
