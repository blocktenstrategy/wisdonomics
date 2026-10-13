import Script from "next/script";

export type EngineInit = {
  userId: string;
  intake: Record<string, unknown>;
  intakeUrl: string;
  submitUrl: string;
  reportUrl: string;
  admin: boolean;
  status: { submittedAt: number | null; releasedAt: number | null; report: { name: string; size: number | null } | null };
};

type Props = {
  init: EngineInit;
  email: string;
  isAdmin: boolean;
  /** Shown when an admin is viewing a client's intake. */
  viewing?: { name: string } | null;
  /** Admin controls shown above a client's intake. */
  adminPanel?: React.ReactNode;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The intake + results engine. The markup and engine.js are ported as-is from the artifact,
 * so the experience matches it exactly. Links out of this page are full page loads (plain <a>),
 * because engine.js runs once per page.
 */
export function Engine({ init, email, isAdmin, viewing, adminPanel }: Props) {
  const acct = `
    <div class="acct">
      ${isAdmin ? `<a class="btn" href="/admin">Clients</a>` : ""}
      <span class="who" title="${esc(email)}">${esc(email)}</span>
      <form method="post" action="/api/signout"><button class="btn" type="submit">Sign out</button></form>
    </div>`;

  const top = `
<canvas id="net" aria-hidden="true"></canvas><div class="glow a" aria-hidden="true"></div><div class="glow b" aria-hidden="true"></div>
${viewing ? `<div class="admin-banner"><span>Admin view: you're editing <b>${esc(viewing.name)}</b>'s intake. Changes save to their account.</span><a href="/admin">← Back to clients</a></div>` : ""}`;

  const skeleton = `
<div class="wrap">
  <header class="mast">
    <div>
      <div class="brand"><img src="/logo.png" alt="" width="34" height="34"><span>Block Ten Strategy</span></div>
      <h1><span class="the">The</span>Wisdon<span class="o">o</span>mics<span class="eng">Engine</span></h1>
      <p>Three pages of intake that feed one CEO framework: who we build trust with, what gives you the edge, and what that trust turns into.</p>
      <div class="ceo"><span><b>C</b>ustomer</span><span><b>E</b>dge</span><span><b>O</b>ffer</span></div>
    </div>
    <div class="session">
      <div class="session-row">${acct}</div>
      <span class="status" id="status">Loading…</span><span class="timer" id="timer" hidden></span>
    </div>
  </header>
  <div class="shell">
    <nav class="rail" id="rail" aria-label="Steps"></nav>
    <main id="main"></main>
  </div>
  <section class="res" id="results" hidden></section>
</div>
<footer class="foot"><span class="brand sm"><img src="/logo.png" alt="Block Ten Strategy" width="26" height="26"><span>blocktenstrategy.com</span></span><b>The Wisdonomics Blueprint</b></footer>`;

  // JSON in a script tag: escape "<" so client text can never close the tag.
  const json = JSON.stringify(init).replace(/</g, "\\u003c");

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: top }} />
      {adminPanel}
      <div dangerouslySetInnerHTML={{ __html: skeleton }} />
      <script id="wde-init" type="application/json" dangerouslySetInnerHTML={{ __html: json }} />
      <Script src="/engine.js?v=2" strategy="afterInteractive" />
    </>
  );
}
