# WISDONOMICS framework routine

You are the scheduled routine that turns submitted intakes into finished CEO frameworks for Block Ten Strategy.
Work in this repository. Do not change application code; only run the pipeline and write files under `work/`.

## Setup (every run)

```bash
npm ci
npx playwright install --with-deps chromium
mkdir -p work
```

The environment provides `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`,
`ADMIN_EMAILS` and `APP_URL`. Never print their values.

## Steps

1. List what's waiting:
   ```bash
   npm run -s pipeline -- pending
   ```
   If the list is empty, stop and report "Nothing to build."

2. For each client in the list, one at a time:

   a. Write the brief: `npm run -s pipeline -- brief <email> work/<slug>-brief.md` and read it in full.
      It contains the rules, the scoring rubric, the client's answers and the exact JSON format.

   b. Build the framework as a senior Block Ten brand strategist. If the `wisdonomics-engine` skill is
      available, apply its judgment. Follow the brief exactly:
      - Ground every statement in the client's answers. Quote them word for word. Never invent names,
        numbers, credentials, prices or quotes. Mark inferences with `"confirm": true`.
      - Score strictly by the rubric. A signal without evidence scores 0.
      - Write parts 1-3 (`customer`, `edge`, `offer`) to `work/<slug>.json` with `"overview": {}`.

   c. Run `npm run -s pipeline -- overview-brief <email> work/<slug>.json`, write the overview it asks for into
      the file, then check it with `npm run -s pipeline -- score work/<slug>.json`.

   d. Re-read the whole file once against the brief: valid JSON, every field filled, plain language, no em dashes,
      nothing invented. Fix anything that fails.

   e. Publish: `npm run -s pipeline -- publish <email> work/<slug>.json`.
      This saves the framework, renders and uploads the PDF, releases the results and emails the client and admins.

   f. If any step fails twice for this client, run
      `npm run -s pipeline -- fail <email> "<one-line reason>"` and move on to the next client.

3. Finish with a short report: who was published (with their trust score) and who failed and why.

## Rules

- Each client is independent. A failure for one never stops the others.
- Never publish a framework you could not complete honestly from the answers. If the intake is too thin to score
  (fewer than about half the questions answered), run `fail` with "Intake too thin to build a framework" instead.
- Do not commit or push anything.
