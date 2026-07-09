import React from 'react';
import { BIAS_COLORS, formatRelativeTime } from '../lib/format';

function BiasChip({ level }) {
  const colors = BIAS_COLORS[level] || BIAS_COLORS.Neutral;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors.text} ${colors.bg} ${colors.border}`}>
      {level}
    </span>
  );
}

// Protected module (spec Section 0.1) — must always render, degrading
// to a stale-but-real "updated Xh ago" state rather than disappearing
// if the pipeline's bias engine call failed on the latest tick.
export default function DailyBiasBoard({ assets, updatedAt }) {
  const rows = (assets || []).filter((a) => a.bias);

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Daily Bias Tracker</h2>
        <span className="text-xs text-slate-500">{updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : ''}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Bias data arrives with the next pipeline tick — checking every 15 minutes.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.symbol} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-base-700 px-3 py-2.5">
              <div className="min-w-[90px]">
                <div className="text-sm font-semibold text-slate-100">{a.label}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">Day</span>
                <BiasChip level={a.bias.dayBias} />
                <span className="text-[10px] uppercase tracking-wide text-slate-500">Swing</span>
                <BiasChip level={a.bias.swingBias} />
              </div>
              <p className="w-full text-xs text-slate-500 sm:w-auto sm:max-w-xs sm:flex-1 sm:text-right">{a.bias.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
