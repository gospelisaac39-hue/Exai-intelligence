import React from 'react';

const PERIODS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'ytd', label: 'YTD' },
];

const RISK_STYLES = {
  Low: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30',
  Moderate: 'text-amber-400 border-amber-900/50 bg-amber-950/30',
  High: 'text-red-400 border-red-900/50 bg-red-950/30',
  Unrated: 'text-slate-500 border-base-700 bg-base-850',
};

export default function PerformanceList({ performance, period, onPeriodChange }) {
  if (!performance) return null;

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Per-Account Performance</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                period === p.value ? 'bg-accent text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {performance.accounts.map((acc) => (
          <div key={acc.id} className="flex items-center justify-between rounded-md border border-base-700 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-200">{acc.nickname}</div>
              <div className="text-xs text-slate-500">{acc.broker}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-300">
                {acc.equity !== null ? acc.equity.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—'}
              </div>
              <div className={`text-xs font-medium ${acc.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {acc.returnPct !== null ? `${acc.returnPct >= 0 ? '+' : ''}${acc.returnPct.toFixed(2)}%` : 'No history yet'}
              </div>
            </div>
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${RISK_STYLES[acc.riskTag]}`}>
              {acc.riskTag}
            </span>
            <span className="text-xs capitalize text-slate-500">{acc.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
