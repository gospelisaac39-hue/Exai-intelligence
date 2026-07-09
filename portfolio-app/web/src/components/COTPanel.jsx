import React from 'react';

// Protected module (spec Section 0.1) — must always render. No 52-week
// history is persisted yet (only the current CFTC snapshot), so the
// "extreme" flag from spec 4.4 isn't computable yet — flagged as a
// known gap rather than faked.
export default function COTPanel({ cotData }) {
  const rows = cotData || [];

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">COT Positioning</h2>
        <span className="text-xs text-slate-500">CFTC · Non-commercial (weekly)</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">CFTC data temporarily unavailable — showing last successful snapshot when available.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => {
            const isLong = c.net >= 0;
            const maxAbs = Math.max(...rows.map((r) => Math.abs(r.net)), 1);
            const widthPct = (Math.abs(c.net) / maxAbs) * 100;
            return (
              <div key={c.pair} className="rounded-md border border-base-700 px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-200">
                    {c.emoji} {c.label}
                  </span>
                  <span className={`font-mono text-xs ${isLong ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isLong ? '+' : ''}
                    {c.net.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${widthPct}%`, background: isLong ? '#34D399' : '#FB7185' }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{c.direction}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
