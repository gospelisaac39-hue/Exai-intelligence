import React from 'react';

const IMPACT_STYLES = {
  high: 'border-red-900/50 bg-red-950/30 text-red-400',
  medium: 'border-amber-900/50 bg-amber-950/30 text-amber-400',
};

export default function EconomicCalendar({ calendar }) {
  if (!calendar) return null;
  const { events, currencies } = calendar;

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Economic Calendar</h2>
        <span className="text-xs text-slate-500">Filtered to {currencies.join(', ')}</span>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No high/medium impact events for your currencies this week.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-base-700 px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${IMPACT_STYLES[e.impact]}`}>
                  {e.currency}
                </span>
                <span className="text-slate-300">{e.title}</span>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>F: {e.forecast}</span>
                <span>P: {e.previous}</span>
                <span>A: {e.actual}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
