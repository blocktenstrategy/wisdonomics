# The WISDONOMICS Engine (web app)

Block Ten Strategy's CEO framework (Customer, Edge, Offer) as an invite-only web app.
Clients sign in with an emailed magic link, fill in the 45-minute intake, generate their
framework, and come back any time to see their results or download them as a PDF.
Admins invite clients, track progress and open any client's intake and results.

**Stack:** Next.js on Vercel · Auth.js (magic links via Resend) · Neon Postgres with Drizzle ·
Vercel AI Gateway (Claude) for generation.

## How it fits together

| Path | What it is |
|---|---|
| `/login` | Email sign-in. Only invited emails (and `ADMIN_EMAILS`) receive a link. |
| `/intake` | The engine: welcome, Simba profile, Edge, Offer, Generate, results page, PDF. |
| `/admin` | Admins: invite clients, see status, trust score, time spent; open a client. |
| `/admin/clients/[id]` | An admin editing or generating a client's intake. |
| `/api/intake` | Autosave (PUT). The saved framework is never overwritten by the browser. |
| `/api/generate` | Runs the Customer, Edge and Offer prompts, then the overview, on the server. |

`public/engine.js` is the engine from the artifact, ported as-is. It now saves to `/api/intake`
and generates through `/api/generate`. The prompts and scoring rules live on the server in
`src/lib/prompts.ts` and `src/lib/scoring.ts`.

## Set up on Vercel (one time)

1. **Push this folder to a new GitHub repository**, then in Vercel: *Add New → Project →* import it.
2. **Storage → Marketplace → Neon.** Create a database and connect it to the project.
   This adds `DATABASE_URL`.
3. **Marketplace → Resend.** Connect it, then in Resend verify your sending domain
   (for example `blocktenstrategy.com`). This adds `RESEND_API_KEY`.
4. **AI Gateway.** Turn it on for the team. On Vercel the app signs in to it automatically.
5. **Settings → Environment Variables**, add:
   - `AUTH_SECRET`: run `npx auth secret` locally and paste the value
   - `AUTH_EMAIL_FROM`: `Block Ten Strategy <hello@blocktenstrategy.com>` (a verified Resend domain)
   - `ADMIN_EMAILS`: your admin emails, comma-separated
   - `AI_MODEL`: a Claude model id offered by AI Gateway, for example `anthropic/claude-sonnet-5-5`
   - `APP_URL`: `https://app.blocktenstrategy.com`
6. **Create the tables.** Locally, with `DATABASE_URL` in `.env.local` (`vercel env pull .env.local`):
   ```bash
   npm install
   npm run db:push
   ```
7. **Settings → Domains:** add `app.blocktenstrategy.com` and follow the DNS instructions.
8. Redeploy, sign in with an admin email, and invite your first client from `/admin`.

Use the **Pro** plan: Generate makes model calls that run for a minute or more.

## Run locally

```bash
cp .env.example .env.local   # or: vercel env pull .env.local
npm install
npm run db:push
npm run dev
```

Locally you also need `AI_GATEWAY_API_KEY` (create one in the Vercel dashboard under AI Gateway).

## Notes

- **Invite-only:** the sign-in callback in `src/auth.ts` refuses any email that isn't in the
  `invite` table or `ADMIN_EMAILS`. Removing access in `/admin` also signs that person out.
- **History:** every generated framework is also stored in the `framework` table, so a later
  rebuild never loses an earlier version.
- **PDF:** built in the browser (html2canvas + jsPDF, loaded from cdnjs on click) and
  downloaded directly. Pages are cut between sections and rows, never through them.
