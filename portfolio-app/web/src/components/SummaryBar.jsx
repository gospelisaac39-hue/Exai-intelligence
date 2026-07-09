import React from 'react';

function fmtMoney(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function Card({ label, children }) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      {children}
    </div>
  );
}

export default function SummaryBar({ summary }) {
  if (!summary) return null;
  const { portfolioValue, capitalDeployed, capitalDeployedPct, dailyPnl, dailyPnlPct, dailyPnlAvailable } = summary;
  const pnlPositive = (dailyPnl ?? 0) >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card label="Portfolio Value">
        <div className="text-2xl font-semibold text-slate-100">{fmtMoney(portfolioValue)}</div>
      </Card>

      <Card label="Capital Deployed">
        <div className="mb-2 text-2xl font-semibold text-slate-100">{fmtMoney(capitalDeployed)}</div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-700">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.min(100, capitalDeployedPct || 0).toFixed(1)}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-500">{(capitalDeployedPct || 0).toFixed(1)}% of equity</div>
      </Card>

      <Card label="Daily P&L">
        {dailyPnlAvailable ? (
          <div className={`text-2xl font-semibold ${pnlPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnlPositive ? '+' : ''}
            {fmtMoney(dailyPnl)}
            <span className="ml-2 text-sm font-medium">
              ({pnlPositive ? '+' : ''}
              {(dailyPnlPct || 0).toFixed(2)}%)
            </span>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Building today's baseline — check back shortly.</div>
        )}
      </Card>
    </div>
  );
}
