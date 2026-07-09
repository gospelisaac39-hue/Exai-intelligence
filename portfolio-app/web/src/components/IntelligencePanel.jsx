import React from 'react';

const BIAS_PILL = {
  LONG: 'border-emerald-900/50 bg-emerald-950/40 text-emerald-400',
  SHORT: 'border-red-900/50 bg-red-950/40 text-red-400',
  HOLD: 'border-amber-900/50 bg-amber-950/40 text-amber-400',
};

const BIAS_BAR = {
  LONG: '#34D399',
  SHORT: '#FB7185',
  HOLD: '#F2A93B',
};

const IMPACT_STYLES = {
  high: 'border-red-900/50 bg-red-950/30 text-red-400',
  medium: 'border-amber-900/50 bg-amber-950/30 text-amber-400',
  low: 'border-base-700 bg-base-850 text-slate-500',
};

function CommentaryBlock({ label, text, accentClass }) {
  return (
    <div className={`border-l-2 pl-3 ${accentClass}`}>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <p className="text-sm leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}

export default function IntelligencePanel({ intelligence }) {
  if (!intelligence) return null;
  const { timestamp, runType, isMajorNewsDay, pair, briefingText, conviction, calendarWeek } = intelligence;

  const generated = timestamp
    ? new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-base-700 bg-base-900">
      {/* Hero: bias + conviction, black-orbit backdrop */}
      <div className="exai-orbit bg-base-950 px-5 py-6">
        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">EXAI Intelligence</h2>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                {generated && <span>Generated {generated}</span>}
                {runType && runType !== 'none' && (
                  <span className="rounded border border-base-700 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-400">
                    {runType}
                  </span>
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
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-slate-100">{pair.name}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${BIAS_PILL[pair.bias]}`}>
                  {pair.bias}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{pair.note}</p>
            </div>

            <div className="w-full max-w-[220px] shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Conviction</span>
                <span className="font-mono text-slate-300">{conviction.score}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${conviction.score}%`, background: BIAS_BAR[pair.bias] }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">{conviction.description}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analyst commentary */}
      <div className="grid grid-cols-1 gap-4 border-t border-base-700 p-5 sm:grid-cols-2">
        <CommentaryBlock label="Fundamental Analyst" text={briefingText.fundamental} accentClass="border-accent" />
        <CommentaryBlock label="Sentiment Analyst" text={briefingText.sentiment} accentClass="border-purple-500" />
        <CommentaryBlock label="Positioning Analyst" text={briefingText.positioning} accentClass="border-cyan-400" />
        <CommentaryBlock
          label="Risk Desk — Bull vs Bear"
          text={`Bull: ${briefingText.bullCase}\n\nBear: ${briefingText.bearCase}`}
          accentClass="border-emerald-500"
        />
      </div>

      {/* This week's macro calendar */}
      {calendarWeek && calendarWeek.length > 0 && (
        <div className="border-t border-base-700 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">This Week — Macro Calendar</h3>
            <span className="text-xs text-slate-500">{calendarWeek.length} events</span>
          </div>
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
        </div>
      )}
    </div>
  );
}
