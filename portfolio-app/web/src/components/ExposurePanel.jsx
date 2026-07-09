import React, { useState } from 'react';

function RiskTooltip({ risk }) {
  const [open, setOpen] = useState(false);
  if (!risk) return null;
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1.5 h-4 w-4 rounded-full border border-base-700 text-[10px] leading-none text-slate-500"
      >
        i
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-base-700 bg-base-850 p-3 text-xs text-slate-400 shadow-xl">
          <p className="mb-2 text-slate-300">{risk.formula}</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Leverage utilization</span>
              <span>{risk.components.leverage.value}%</span>
            </div>
            <div className="flex justify-between">
              <span>Concentration</span>
              <span>{risk.components.concentration.value}%</span>
            </div>
            <div className="flex justify-between">
              <span>Drawdown</span>
              <span>{risk.components.drawdown.value}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExposureBar({ item }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-200">{item.currency}</span>
        <span className="text-slate-500">
          {item.direction !== 'flat' && (
            <span className="mr-2 rounded border border-base-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {item.direction}
            </span>
          )}
          {item.pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-700">
        <div className="h-full rounded-full bg-accent" style={{ width: `${item.pct}%` }} />
      </div>
    </div>
  );
}

export default function ExposurePanel({ exposure, riskGauge }) {
  if (!exposure) return null;
  const { breakdown, concentrationWarnings, risk } = exposure;

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Exposure &amp; Risk</h2>
        <div className="flex items-center text-sm">
          <span className="text-slate-500">Risk score</span>
          <span className="ml-2 font-semibold text-slate-100">{risk?.score ?? '—'}</span>
          <RiskTooltip risk={risk} />
        </div>
      </div>

      {breakdown.length === 0 ? (
        <p className="text-sm text-slate-500">
          Book is flat.
          {riskGauge ? ` Market is ${riskGauge.label.toLowerCase()} (${riskGauge.score}) — bias board below.` : ' See the bias board below for today\'s market read.'}
        </p>
      ) : (
        <div className="mb-4">
          {breakdown.map((item) => (
            <ExposureBar key={item.currency} item={item} />
          ))}
        </div>
      )}

      {concentrationWarnings?.length > 0 && (
        <div className="space-y-2">
          {concentrationWarnings.map((w) => (
            <div
              key={w.currency}
              className="rounded-md border border-accent-dim bg-accent-dim/20 px-3 py-2 text-xs text-slate-300"
            >
              {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
