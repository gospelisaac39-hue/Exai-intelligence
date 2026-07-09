# EXAI Terminal — Phase 0 Audit Report

Audited against `EXAI TERMINAL — REBUILD SPECIFICATION v1.0`. No code changes made — this is a read-only inventory, as mandated by Section 8, Phase 0. All findings cite `file:line`.

---

## 1. Protected modules (Section 0.1) — current state

| Module | Status | Detail |
|---|---|---|
| Daily Bias Tracker | **Does not exist** | No day/swing bias concept anywhere. `portfolio-app/server/src/intelligence/routes.js:28-38` (`mapPair`) derives a single LONG/SHORT/HOLD bias for one instrument per run — not per watched asset, not day-vs-swing, no 5-level scale, no reasoning line. |
| AI News Feed | **Does not exist in the app** | `src/processing/filterNews.js` categorizes/scores headlines correctly (buckets, breaking-news detection), but the output only ever reaches the *email* (`src/email/formatEmail.js:466-489`, "Market Headlines" section). Nothing in `portfolio-app/web/src/components/` renders a news feed. Confirmed by search — no matching component file exists. |
| Economic Calendar (with context) | **Partial** | `IntelligencePanel.jsx` and `EconomicCalendar.jsx` render a bare list (currency, event, time). The "why it matters" context (`anticipation`, `bullCase`, `bearCase`, `noSurprise` fields) is computed in `src/processing/parseEvents.js` (`getAnticipation()`, ~line 130) but never surfaced in the dashboard — only in the email template. |
| Sentiment Gauge | **Does not exist** | Sentiment is rendered as a text block (`IntelligencePanel.jsx`, "Sentiment" `CommentaryBlock`), not a 0–100 gauge. No gauge component, no 0–100 score, no Panic/Fear/Neutral/Optimism/Euphoria labels anywhere. |
| Risk-On/Risk-Off Gauge | **Exists, first-pass only** | `portfolio-app/server/src/intelligence/routes.js:65-79` (`mapRiskGauge`). Built last session. Heuristic: sentiment-agent tone ± major-news-day ± breaking-news count. No dominant-theme label ("geopolitics/inflation/growth/central banks" per spec 4.6), no reasoning sentence. Visual gauge exists in `IntelligencePanel.jsx` (`RiskGauge` component) and matches spec's "keep existing visual language."|
| COT Positioning Panel | **Data exists, no panel** | `src/sources/cot.js` fetches real CFTC data (fixed last session — was 403ing, now returns 7 instruments). `cotData` is included in the `/api/intelligence` response, but **no component renders it** in `portfolio-app/web`. The old standalone `dashboard.html` (deleted this session, see git history at commit `06fee5f`) had a COT chart; it was never rebuilt in `portfolio-app`. |
| Watchlist | **Exists** | Built last session: `watched_assets` table, `/api/assets` GET/PUT, `AssetPicker.jsx`, onboarding step, `Settings.jsx` page. Functional but the catalog (`portfolio-app/server/src/assets/catalog.js`) has **10 assets**, not the ~40-asset universe in spec Section 4.7 (no crosses, no indices, no additional metals beyond gold, no crypto, no US10Y). |

**Nothing was found to have been "deleted" from git history that matches these modules** — a git log search for prior dashboard iterations (`src/dashboard/`, deleted `dashboard.html`) shows only a single-instrument, single-pair dashboard style (COT chart, Fed-rate chart, calendar list) — never a Daily Bias Tracker, Sentiment Gauge, or News Feed in the spec's sense. These are genuinely new modules to build, not regressions to recover.

---

## 2. Pipeline audit

| Stage | What exists | What's broken/stubbed |
|---|---|---|
| **Parse Events** (`src/processing/parseEvents.js`) | Full port of the n8n node: impact tiers, USD-only anticipation, gold/oil flags, chain position labels, week-ahead/week-calendar grouping, bank holidays. | See Section 3 below — 3 of the 5 flagged Market Logic errors are present here as written code, not just in the reference PDF. |
| **Groq calls** (`src/ai/groq.js`, `src/ai/orchestrator.js`) | Single `axios.post` to `chat/completions`, sequential 7-agent debate (fundamentals → sentiment → positioning → bull → bear → trader → risk) for **one instrument per run**, gated by `isMajorNewsDay` (`src/runWorkflow.js:178`). Runs twice daily (6am/2pm WAT) + on `postRelease` ticker triggers. | No JSON mode / `response_format` (`src/ai/groq.js:16-23` — plain `messages` array, free-text response parsed downstream). No shared `llm.ts`-style interface — Groq is called directly from `orchestrator.js`'s agent modules, not behind an abstraction. No per-asset loop — this is the single biggest gap vs. spec Section 3/4.1 (bias board needs one analysis per watched asset, not one per run). |
| **FF ingestion** (`src/sources/forexFactory.js`) | `fetchForexFactoryCalendar()` (JSON feed, working) is the reliable source per spec Section 7. `fetchForexFactoryActuals()` (HTML scrape) still 403s — expected/deprioritized already, since actuals now come from the Sheet/ticker fix made last session. | Confirmed still 403ing in production logs as of last verified run. Not urgent per spec (JSON calendar is the recommended route; scraping is called "fragile" in spec Section 7 too). |
| **COT ingestion** (`src/sources/cot.js`) | Fixed last session (added browser `User-Agent`, was 403ing). Returns 7 instruments with real net-positioning data. | Not on an independent weekly Friday cron — it's fetched inline inside `runWorkflow()` (2x/day) and every 15-min ticker run (`src/eventTicker.js`). Harmless (CFTC only publishes weekly, so refetching more often just re-reads the same data) but doesn't match spec's "weekly Friday ~20:30 UTC" schedule literally. No 52-week history stored, no "extreme" flag (top/bottom 10% of 3-year range) — `cotData` is a single current snapshot only. |
| **Scheduling** | Long-running Railway process (`node-cron`), not Vercel Cron: main workflow `0 6,14 * * 1-5`; event-lifecycle ticker `*/15 * * * *`; internal data-bridge HTTP server (`src/dataServer.js`) for the separate portfolio-app service. | Spec explicitly allows "Vercel Cron **or equivalent**" — this qualifies. Real gap: no independent 4-hour bias-regeneration cadence, no 1-hour-before-session-open triggers (Tokyo/London/NY) — only the twice-daily + event-triggered cadence exists. |
| **n8n runtime** | None. Fully ported to Node.js; no n8n process runs anywhere in this deployment. | N/A |

---

## 3. Market Logic Framework — Section 10 corrections, checked one by one

| # | Spec's flagged error | Found in code? | Location |
|---|---|---|---|
| 1 | King Rule polarity — blanket "Actual>Forecast=bullish" | **Two separate, incomplete, inconsistent implementations**, not the unified `polarity` field the spec wants | `src/processing/parseEvents.js:356-366` (`isDownGood`, covers unemployment/jobless/interest-rate/fomc only) and `src/email/formatEmail.js:177-192` (`lowerIsBetter`, covers unemployment/jobless/claims only — doesn't even match the first list). Neither covers Crude Oil Inventories or Natural Gas Storage inversions. No `confidence` field, no `scenarioNotes[]` anywhere. |
| 2 | Fed speakers hardcoded direction ("Powell speaks → always dovish") | **Not implemented in code** — only in the reference PDF | `src/processing/parseEvents.js:161,167` and `src/email/formatEmail.js:91-92` mention Powell only as a volatility/attention note ("every word moves the Dollar," "Powell press conference drives market MORE than the decision itself") — no hardcoded up/down direction assigned. This is a "do not introduce" item, not a "fix existing" item. |
| 3 | NFP miss auto-labeled "sustained bull run," no confirmation gate | **Present as flagged, hardcoded** | `src/processing/parseEvents.js:172,174,178` and `:459` — "Gold buys into sustained bull run" / "Gold enters sustained bull run" stated unconditionally on a single miss, no 2-consecutive-print check, no revisions/average-hourly-earnings cross-check. |
| 4 | ISM Manufacturing hardcoded to outweigh Services | **Present as flagged, hardcoded** | `src/processing/parseEvents.js:230-231` — `isManuf ? ' ISM Manufacturing carries more weight than ISM Services.' : ''` unconditionally appended. |
| 5 | Fundamental chain treated as calendar-ordered, not causal | **Present as flagged** | `src/processing/parseEvents.js` `getChainPosition()` (~line 82) and `buildChainContext()` (~line 445) assign/report Step 1–6 by title match only — no cross-referencing of a prior month's actual PPI value when interpreting today's CPI, etc. Purely a label lookup, not causal linking. |

**All 5 flagged errors are confirmed** — 4 present in shipped code (not just the PDF), 1 (Fed-speaker direction) is absent from code and just needs to stay that way.

---

## 4. Hardcoded assets, empty states, "Not analyzed" strings

**Hardcoded single-instrument assumption:**
- `src/ai/orchestrator.js:140` — `finalDecision.instrument` defaults to `'EUR/USD'` if the trader agent doesn't return one. This is the root cause of last session's "why EUR/USD, I trade gold" complaint — the whole AI layer analyzes one instrument per run, full stop.

**Forbidden empty-state / dead-end strings found (Section 6 + 9 checklist):**
- `"Not analyzed in the most recent run yet."` — `portfolio-app/server/src/intelligence/routes.js:104` — **exact match to the spec's explicitly forbidden string**, introduced last session.
- `"No fundamental analysis available"` / `"No positioning analysis available"` / `"No sentiment analysis available"` / `"Bull case unavailable"` / `"Bear case unavailable"` — `portfolio-app/server/src/intelligence/routes.js:47-51`.
- `"No open positions to compute exposure from yet."` — `ExposurePanel.jsx:76`.
- `"Not enough trade history yet to generate insights — check back after a few closed trades."` — `InsightsFeed.jsx:19`.
- `"No open positions across your connected accounts."` — `PositionsTable.jsx:48`.
- The "no accounts connected" state currently renders the banner **and** six modules below it in zero/empty states simultaneously (`Dashboard.jsx:117-142` renders `SummaryBar`, `IntelligencePanel`, `ExposurePanel`, `PerformanceList`, `PositionsTable`, `InsightsFeed`, `EconomicCalendar` unconditionally) — this is precisely the anti-pattern Section 6's table forbids ("Six $0/no positions modules" instead of "One connect CTA card; market modules fill the page").

**Asset universe gap:** `portfolio-app/server/src/assets/catalog.js` has 10 assets (Gold, WTI, DXY, 7 FX majors). Spec Section 4.7 wants ~40 across FX majors/minors, metals, indices, energy, crypto, DXY, US10Y.

---

## 5. Environment variables / API keys in use

**Root pipeline (`.env`):**
| Var | Purpose |
|---|---|
| `GROQ_API_KEY` | AI agent calls |
| `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN/SENDER_EMAIL/SENDER_NAME/REPLY_TO` | Email delivery (Gmail API, fixed last session — was SMTP, blocked on Railway) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY` | Google Sheets read/write (subscribers, actuals, RunLog) |
| `SUBSCRIBERS_SHEET_ID/TAB` | Subscriber list sheet |
| `INDICATORS_SHEET_ID/TAB` | "Exai Indicators" actuals sheet — **stale since 2026-04-03**, flagged last session, still unresolved |
| `CRON_SCHEDULE` | Main workflow cadence, `0 6,14 * * 1-5` |
| `TIMEZONE` | `Africa/Lagos` (WAT) |

**Portfolio server (`portfolio-app/server/.env`):**
| Var | Purpose |
|---|---|
| `PORT`, `FRONTEND_URL` | Server bind + CORS origin |
| `JWT_SECRET` | Session auth |
| `DATABASE_PATH` | SQLite file location |
| `METAAPI_TOKEN` | MT4/5 broker connection — **unset**, broker features disabled |
| `GROQ_API_KEY` | AI Insights feed (separate from root pipeline's usage) |

**Railway-only (not in `.env.example`, injected at deploy time):** `EXAI_DATA_URL` (internal data-bridge between the two Railway services), `NODE_ENV` (controls cross-origin cookie `SameSite`/`Secure` flags), `RAILWAY_DOCKERFILE_PATH`.

**Not present anywhere:** any price-data API key (Twelve Data/Finnhub per spec Section 7), any news API key (Marketaux/NewsData), any edgeful API key. Confirms: live prices today come exclusively from TradingView's free display widget (no structured price data available server-side for sparklines/session-range/% change per spec 4.8), and there is no independent news ingestion beyond the Telegram/BRICS-news scrape already in `src/sources/telegram.js`.

---

## Summary for Phase 1 planning

The foundational pieces (calendar parsing, Groq agents, COT/FedWatch fetchers, email delivery, watchlist persistence, risk gauge, auth) are real and working — this is not a from-scratch build. The gap is architectural: **everything today assumes one instrument per pipeline run**, while the spec needs **N assets analyzed per run, on independent cadences, with the UI purely rendering the latest persisted output** (Section 3's "golden rule"). That single change — parameterizing the orchestrator over the asset catalog instead of one hardcoded instrument — is the load-bearing piece Phase 1 depends on; the Daily Bias Tracker, per-asset Sentiment Gauge, and COT panel are all downstream of it.

Also flagging one point of tension for your review: Section 0.6 says "Not analyzed in the most recent run yet must never appear — show the last run's output with its timestamp instead," but until the orchestrator is parameterized per-asset, there genuinely is no prior output for most watched assets to fall back to. Phase 1's asset-parameterized pipeline needs to exist before that empty state can be replaced with real history rather than a differently-worded placeholder.

No code changes were made in this pass, per Section 8.
