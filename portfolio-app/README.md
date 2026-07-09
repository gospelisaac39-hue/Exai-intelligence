# EXAI Portfolio Intelligence

Read-only portfolio dashboard for MT4/MT5 traders. Connects via MetaApi.cloud
using investor (read-only) logins only — this app can never place, modify, or
close a trade.

## Structure

- `server/` — Express + SQLite (`node:sqlite`, no native build step) backend
- `web/` — React + Vite + Tailwind frontend

## Setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env`:
- `JWT_SECRET` — any long random string
- `METAAPI_TOKEN` — from https://app.metaapi.cloud (API access → generate token). Without this, auth and the dashboard shell work, but broker connections are disabled.
- `GROQ_API_KEY` — from https://console.groq.com/keys, for the AI Insights feed

```bash
npm run dev
```

Runs on http://localhost:4000.

### 2. Web

```bash
cd web
npm install
npm run dev
```

Runs on http://localhost:5173.

## Notes

- Requires Node 22.5+ (uses the built-in `node:sqlite` module).
- The economic calendar reuses `fetchForexFactoryCalendar()` from the root
  pipeline's `src/sources/forexFactory.js` — no separate fetcher.
- Broker connection (MetaApi provisioning + live streaming) needs a real
  `METAAPI_TOKEN` and a real MT4/MT5 demo account to test end-to-end; it
  hasn't been exercised against a live account yet.
- `npm audit` on `server/` reports vulnerabilities coming from
  `metaapi.cloud-sdk`'s dependency tree — review before production use.
