# The WISDONOMICS Engine (web app)

Block Ten Strategy's CEO framework (Customer, Edge, Offer) as an invite-only web app.
Clients sign in with an emailed magic link, fill in the 45-minute intake and submit it for review.
Block Ten builds the framework (in Claude Code), uploads a designed PDF, and sends the results.
Clients come back any time to see their results page and download the report.

**Stack:** Next.js on Vercel · Auth.js (magic links via Resend) · Neon Postgres with Drizzle ·
Vercel Blob (private) for PDF reports. No AI runs inside the app.

## The workflow

1. **Invite** a client from `/admin`. They get a branded email and sign in with a magic link.
2. The client fills in the intake and clicks **Submit for review**. Admins get an email.
3. **Build the framework** in Claude Code:
   `npm run clients -- pull client@email.com answers.json`, generate the framework with the
   `wisdonomics-engine` skill (rubric and prompts are in `src/lib/prompts.ts`), then
   `npm run clients -- push client@email.com framework.json`.
4. On the client's admin page, preview the results, **upload the designed PDF**, and click
   **Send results**. The client gets an email and can now see the results page and download the PDF.

## How it fits together

| Path | What it is |
|---|---|
| `/login` | Email sign-in. Only invited emails (and `ADMIN_EMAILS`) receive a link. |
| `/intake` | The engine: welcome, Simba profile, Edge, Offer, Submit, then results and the PDF once sent. |
| `/admin` | Admins: invite clients, see status, trust score, time spent; open a client. |
| `/admin/clients/[id]` | Review panel (submitted → framework → PDF → send) above the client's intake. |
| `/api/intake` | Autosave (PUT). The saved framework is never overwritten by the browser. |
| `/api/submit` | Marks the intake submitted and emails the admins. |
| `/api/report` | Streams the private PDF to the client (after results are sent) or an admin. |
| `/api/report/upload` | Admin-only token for uploading a PDF straight from the browser to Blob. |

`public/engine.js` is the engine from the artifact, ported as-is. It saves to `/api/intake`;
its last step is now Submit → In review → Results.

## Set up on Vercel (one time)

1. **Push this folder to a new GitHub repository**, then in Vercel: *Add New → Project →* import it.
2. **Storage → Marketplace → Neon.** Create a database and connect it to the project.
   This adds `DATABASE_URL`.
3. **Marketplace → Resend.** Connect it, then in Resend verify your sending domain
   (for example `blocktenstrategy.com`). This adds `RESEND_API_KEY`.
4. **Storage → Blob.** Create a Blob store and connect it to the project.
   This adds `BLOB_READ_WRITE_TOKEN`. Reports are stored as private files.
5. **Settings → Environment Variables**, add:
   - `AUTH_SECRET`: run `npx auth secret` locally and paste the value
   - `AUTH_EMAIL_FROM`: `Block Ten Strategy <hello@blocktenstrategy.com>` (a verified Resend domain)
   - `ADMIN_EMAILS`: your admin emails, comma-separated
   - `APP_URL`: `https://app.blocktenstrategy.com`
6. **Create the tables.** Locally, with `DATABASE_URL` in `.env.local` (`vercel env pull .env.local`):
   ```bash
   npm install
   npm run db:push
   ```
7. **Settings → Domains:** add `app.blocktenstrategy.com` and follow the DNS instructions.
8. Redeploy, sign in with an admin email, and invite your first client from `/admin`.


## Run locally

```bash
cp .env.example .env.local   # or: vercel env pull .env.local
npm install
npm run db:push
npm run dev
```


## Notes

- **Invite-only:** the sign-in callback in `src/auth.ts` refuses any email that isn't in the
  `invite` table or `ADMIN_EMAILS`. Removing access in `/admin` also signs that person out.
- **History:** every generated framework is also stored in the `framework` table, so a later
  rebuild never loses an earlier version.
- **PDFs:** clients download the PDF you upload. On the results preview, admins also get a
  **PDF** button that exports the results page as a designed PDF (cut between sections and rows),
  which you can upload as-is or polish first.
- **Turning on in-app AI later:** the rubric and prompts are kept in `src/lib/prompts.ts`.
