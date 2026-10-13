/** Branded emails sent through Resend's HTTP API. */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function shell(title: string, body: string, cta: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#000;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#fff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#110d14;border:1px solid #2a2230;border-radius:20px;padding:32px">
<tr><td style="font:700 11px/1 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#BF7BCB;padding-bottom:16px">Block Ten Strategy</td></tr>
<tr><td style="font:800 26px/1.1 Helvetica,Arial,sans-serif;letter-spacing:-.01em;text-transform:uppercase;padding-bottom:14px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;color:rgba(255,255,255,.75);padding-bottom:24px">${body}</td></tr>
<tr><td><a href="${cta.href}" style="display:inline-block;background:#A35EB1;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px">${esc(cta.label)}</a></td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:rgba(255,255,255,.45);padding-top:24px">If the button doesn't work, copy this link into your browser:<br><span style="color:rgba(255,255,255,.7);word-break:break-all">${esc(cta.href)}</span></td></tr>
</table>
<p style="font-size:12px;color:rgba(255,255,255,.4);margin-top:18px">blocktenstrategy.com · The Wisdonomics Blueprint</p>
</td></tr></table></body></html>`;
}

export function resendKey(): string | undefined {
  return process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;
}

async function send(to: string | string[], subject: string, html: string, text: string) {
  const key = resendKey();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const from = process.env.AUTH_EMAIL_FROM;
  if (!from) throw new Error("AUTH_EMAIL_FROM is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

export async function sendMagicLink(to: string, url: string) {
  await send(
    to,
    "Your sign-in link for the Wisdonomics Engine",
    shell("Sign in", "Click the button to sign in to the Wisdonomics Engine. The link works once and expires in 24 hours.", { href: url, label: "Sign in" }),
    `Sign in to the Wisdonomics Engine: ${url}\n\nThe link works once and expires in 24 hours.`,
  );
}

export async function sendInvite(to: string, name: string | null, loginUrl: string) {
  const hi = name ? `Hi ${esc(name)}, you` : "You";
  await send(
    to,
    "You're invited to the Wisdonomics Engine",
    shell(
      "You're invited",
      `${hi}'ve been invited to the Wisdonomics Engine by Block Ten Strategy. Block 45 minutes, sign in with this email address, and you'll build your CEO framework: Customer, Edge and Offer.`,
      { href: loginUrl, label: "Get started" },
    ),
    `${name ? `Hi ${name}, you` : "You"}'ve been invited to the Wisdonomics Engine by Block Ten Strategy. Sign in with this email address: ${loginUrl}`,
  );
}

/** Tells the admins a client has submitted, with a link to their page. */
export async function sendSubmittedNotice(to: string[], clientName: string, clientEmail: string, adminUrl: string) {
  if (!to.length) return;
  await send(
    to,
    `${clientName} submitted their intake`,
    shell(
      "New submission",
      `<b style="color:#fff">${esc(clientName)}</b> (${esc(clientEmail)}) just submitted their Wisdonomics intake. Their answers are ready for you to build their CEO framework.`,
      { href: adminUrl, label: "Open their intake" },
    ),
    `${clientName} (${clientEmail}) submitted their Wisdonomics intake. Open it: ${adminUrl}`,
  );
}

/** Tells a client their results are ready. */
export async function sendResultsReady(to: string, name: string | null, url: string) {
  const hi = name ? `Hi ${esc(name)}, your` : "Your";
  await send(
    to,
    "Your CEO framework is ready",
    shell(
      "Your results are ready",
      `${hi} CEO framework from Block Ten Strategy is ready: who you build trust with, what gives you the edge, and what that trust turns into. Sign in to see your results and download your report.`,
      { href: url, label: "See my results" },
    ),
    `${name ? `Hi ${name}, your` : "Your"} CEO framework from Block Ten Strategy is ready. Sign in to see it: ${url}`,
  );
}

/** A short notice to the admins (automation results and failures). */
export async function sendAdminNotice(to: string[], subject: string, body: string, cta?: { href: string; label: string }) {
  if (!to.length) return;
  await send(
    to,
    subject,
    shell(subject, esc(body).replace(/\n/g, "<br>"), cta ?? { href: (process.env.APP_URL || "") + "/admin", label: "Open the dashboard" }),
    `${body}${cta ? `\n\n${cta.href}` : ""}`,
  );
}
