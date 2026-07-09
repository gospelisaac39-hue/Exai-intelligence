import React from 'react';
import PriceCard from './PriceCard.jsx';
import DailyBiasBoard from './DailyBiasBoard.jsx';
import NewsFeed from './NewsFeed.jsx';
import SentimentGauge from './SentimentGauge.jsx';
import COTPanel from './COTPanel.jsx';
import { formatRelativeTime } from '../lib/format';

const RISK_LABEL_STYLES = {
  'RISK-ON': 'text-emerald-400',
  'RISK-OFF': 'text-red-400',
  NEUTRAL: 'text-amber-400',
};

const IMPACT_STYLES = {
  high: 'border-red-900/50 bg-red-950/30 text-red-400',
  medium: 'border-amber-900/50 bg-amber-950/30 text-amber-400',
  low: 'border-base-700 bg-base-850 text-slate-500',
};

function RiskGauge({ riskGauge }) {
  if (!riskGauge) return null;
  return (
    <div className="w-full max-w-[260px] shrink-0">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Risk Gauge</span>
        <span className={`font-mono font-semibold ${RISK_LABEL_STYLES[riskGauge.label] || 'text-slate-300'}`}>{riskGauge.label}</span>
      </div>
      <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 opacity-30">
        <div className="absolute inset-0 bg-base-950" style={{ clipPath: `inset(0 0 0 ${riskGauge.score}%)` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
        <span>Risk-off ← {riskGauge.score} → Risk-on</span>
        {riskGauge.dominantTheme && <span>{riskGauge.dominantTheme}</span>}
      </div>
    </div>
  );
}

export default function IntelligencePanel({ intelligence }) {
  if (!intelligence) return null;
  const {
    timestamp,
    runType,
    isMajorNewsDay,
    riskGauge,
    sentimentScore,
    sentimentScoreUpdatedAt,
    newsFeed,
    newsFeedUpdatedAt,
    assets,
    cotData,
    calendarWeek,
  } = intelligence;

  const generated = timestamp ? formatRelativeTime(timestamp) : null;
  const watchedSymbols = (assets || []).map((a) => a.symbol);

  return (
    <div className="space-y-4">
      {/* Hero: macro status + risk gauge, black-orbit backdrop */}
      <div className="exai-orbit overflow-hidden rounded-xl border border-base-700 bg-base-950 px-5 py-6">
        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">EXAI Intelligence</h2>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                {generated && <span>Generated {generated}</span>}
                {runType && runType !== 'none' && (
                  <span className="rounded border border-base-700 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-400">{runType}</span>
                )}
                {isMajorNewsDay && (
                  <span className="rounded border border-amber-900/50 bg-amber-950/30 px-1.5 py-0.5 text-[10px] uppercase text-amber-400">
                    Major news day
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Live
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              {sentimentScore?.dominantTheme
                ? `${sentimentScore.dominantTheme} driving flows today.`
                : "Live prices and analysis for the assets you're watching."}
            </p>
            <RiskGauge riskGauge={riskGauge} />
          </div>
        </div>
      </div>

      {/* Watchlist price cards */}
      <div className="rounded-xl border border-base-700 bg-base-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Watchlist</h2>
        {!assets || assets.length === 0 ? (
          <p className="text-sm text-slate-500">
            No watched assets yet — pick what you trade in <a href="/settings" className="text-accent-soft hover:underline">Settings</a>.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => (
              <PriceCard key={asset.symbol} asset={asset} />
            ))}
          </div>
        )}
      </div>

      <DailyBiasBoard assets={assets} updatedAt={assets?.[0]?.biasBoardUpdatedAt} />

      <NewsFeed items={newsFeed} updatedAt={newsFeedUpdatedAt} watchedSymbols={watchedSymbols} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SentimentGauge sentiment={sentimentScore} updatedAt={sentimentScoreUpdatedAt} />
        <COTPanel cotData={cotData} />
      </div>

      {/* This week's macro calendar */}
      <div className="rounded-xl border border-base-700 bg-base-900 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">This Week — Macro Calendar</h3>
          <span className="text-xs text-slate-500">{calendarWeek?.length || 0} events</span>
        </div>
        {!calendarWeek || calendarWeek.length === 0 ? (
          <p className="text-sm text-slate-500">No releases scheduled this week for your currencies.</p>
        ) : (
          <div className="space-y-2">
            {calendarWeek.slice(0, 8).map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-base-700 px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${IMPACT_STYLES[e.impact] || IMPACT_STYLES.low}`}>
                    {e.currency}
                  </span>
                  <span className="text-slate-300">{e.event}</span>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {e.day && e.day !== 'Today' ? `${e.day.slice(0, 3)} ` : ''}
                  {e.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
