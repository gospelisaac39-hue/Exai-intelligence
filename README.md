# EXAI Intelligence

A Node.js port of the EXAI Intelligence n8n workflow: fetches forex/gold market
data from five sources (ForexFactory calendar, Telegram/BRICS news, CFTC COT
positioning, Fed rate probabilities, and a Google Sheet of released economic
actuals), builds a three-layer prompt, sends it to Groq for AI analysis, then
formats and emails a daily briefing to your subscriber list.

This README covers running it locally in VS Code. GitHub + Railway deployment
is a separate later step — get it running locally first.

## 1. Prerequisites

- Node.js 18 or newer (`node --version` to check)
- VS Code
- A Groq API key
- A Gmail account to send from, with OAuth2 credentials
- A Google Cloud Service Account (for reading the two Google Sheets)

## 2. Open the project in VS Code

Open the `exai-intelligence` folder in VS Code (File > Open Folder). Open a
terminal inside VS Code (`` Ctrl+` `` / `` Cmd+` ``) — every command below runs there.

## 3. Install dependencies

```bash
npm install
```

## 4. Set up your environment file

```bash
cp .env.example .env
```

Open `.env` in VS Code and fill in each value. Do not skip this — the app
will tell you exactly which variable is missing when you try to run it.

### 4a. Groq API key

Go to https://console.groq.com/keys and create a new key. Paste it into
`GROQ_API_KEY`.

> The original n8n export had a live Groq key hardcoded in plain text inside
> the workflow JSON. If that key is still active, revoke it in the Groq
> console — treat it as compromised since it was sitting in an exported file.

### 4b. Gmail OAuth2 (same method the n8n workflow used)

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. Enable the **Gmail API** for that project (APIs & Services > Library).
3. Go to APIs & Services > Credentials > Create Credentials > OAuth client ID.
   - Application type: **Desktop app**
   - Copy the generated Client ID and Client Secret into `.env` as
     `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`.
4. Also set `GMAIL_SENDER_EMAIL` (the Gmail address you're sending from) and
   optionally `GMAIL_REPLY_TO`.
5. Run the one-time helper script to generate a refresh token:
   ```bash
   node scripts/gmailAuth.js
   ```
   It prints a URL — open it, sign in with the sending Gmail account, approve
   access, and paste the code it gives you back into the terminal. The script
   prints a `GMAIL_REFRESH_TOKEN=...` line — copy that into your `.env`.

### 4c. Google Sheets Service Account (subscriber list + actuals sheet)

1. In the same Google Cloud project: IAM & Admin > Service Accounts > Create
   Service Account. Any name is fine (e.g. `exai-sheets-reader`).
2. Open the new service account > Keys > Add Key > Create new key > JSON.
   This downloads a `.json` file — keep it private, do not commit it.
3. Open that JSON file and copy two fields into `.env`:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (paste it exactly as
     one line, including the `\n` characters — it'll look messy, that's fine)
4. Share **both** Google Sheets (the subscriber list and the "Exai
   Indicators" sheet) with the service account's email address as a Viewer.
   Without this share step the app can authenticate but will get a
   permission error reading the sheet.
5. `SUBSCRIBERS_SHEET_ID` and `INDICATORS_SHEET_ID` in `.env.example` are
   already pre-filled with the IDs from your original n8n workflow — check
   they still match your sheets, and adjust `SUBSCRIBERS_SHEET_TAB` /
   `INDICATORS_SHEET_TAB` if your tab names differ from `Sheet1`.

## 5. Run it

Run once, immediately, without sending real email (safe to test with):

```bash
node src/index.js --once --dry-run
```

This runs the whole pipeline (fetch → parse → AI → format) and prints a
summary, but skips the final Gmail send so you can check it works without
spamming your list.

Run once for real (sends actual emails to active subscribers):

```bash
node src/index.js --once
```

Run as a long-lived scheduler (mirrors the original n8n cron trigger —
05:00 and 14:00 WAT, Monday–Friday, configurable via `CRON_SCHEDULE` in
`.env`):

```bash
node src/index.js
```

This last command is what you'd eventually run continuously on Railway. For
local VS Code use, `--once --dry-run` while you're iterating is the fastest
feedback loop — use the "Run and Debug" panel or just re-run the terminal
command after each change.

## 6. Reading the output

Every step logs to the terminal: which sources fetched successfully, how
many news articles were filtered/categorized, how many calendar events were
found, whether COT/FedWatch data loaded, and the final email subject lines
and recipient count. If something fails (a source 403s, a sheet isn't
shared, a credential is missing) you'll see exactly which step failed and
why — the workflow is built to continue past individual source failures
where possible (e.g. if Telegram is down, news sections will just be empty
rather than crashing the whole run).

## Project structure

```
src/
  index.js              entry point — cron scheduler or --once runner
  runWorkflow.js         orchestrates the full pipeline, in order
  config.js              reads all settings from .env
  runTypeDetector.js     morning / week_ahead / actuals detection
  sources/               fetchers — ForexFactory, Telegram, COT, FedWatch, Sheets
  processing/             parsing/filtering — news, calendar events, prompt builder
  ai/groq.js              Groq API call
  email/                  HTML formatting + Gmail sending
scripts/gmailAuth.js      one-time OAuth2 refresh token generator
```

## Dashboard

The dashboard lives in `portfolio-app/` (a separate React + Express app),
not in this repo — see `portfolio-app/README.md` to run it. Its server
reads `data/latest-run.json` directly from this pipeline (written by every
run, via `src/dashboard/dataStore.js`) the same way it reads
`src/sources/forexFactory.js` for the economic calendar — no second
dashboard server to keep in sync.

The "This Week" macro calendar shown there is the ForexFactory weekly
feed (`eventsResult.weekCalendarAll`), not the "Exai Indicators" Google
Sheet — that sheet only holds released economic actuals used to enrich
the AI prompt, not a calendar.

## What's next (not yet built)

- Pushing this to GitHub and deploying continuously on Railway
- Groq is getting rate-limited (429s) mid-run on some agents — consider
  a slower stagger or a paid tier
