import React, { useMemo, useState } from 'react';

const COLUMNS = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'account', label: 'Account' },
  { key: 'direction', label: 'Direction' },
  { key: 'size', label: 'Size' },
  { key: 'entryPrice', label: 'Entry Price' },
  { key: 'currentPrice', label: 'Current Price' },
  { key: 'unrealizedPnl', label: 'Unrealized P&L' },
  { key: 'openedAt', label: 'Opened At' },
];

function fmtNum(n, digits = 2) {
  return typeof n === 'number' ? n.toFixed(digits) : '—';
}

export default function PositionsTable({ positions }) {
  const [sortKey, setSortKey] = useState('openedAt');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const rows = [...positions];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [positions, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-100">Open Positions</h2>

      {positions.length === 0 ? (
        <p className="text-sm text-slate-500">No open positions across your connected accounts.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-base-700 text-xs uppercase tracking-wide text-slate-500">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="cursor-pointer select-none whitespace-nowrap py-2 pr-4 hover:text-slate-300"
                  >
                    {col.label}
                    {sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-base-700/60 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-200">{p.symbol}</td>
                  <td className="py-2 pr-4 text-slate-400">{p.account}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium uppercase ${
                        p.direction === 'buy' ? 'bg-accent-dim/40 text-accent-soft' : 'bg-base-700 text-slate-300'
                      }`}
                    >
                      {p.direction}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-300">{fmtNum(p.size)}</td>
                  <td className="py-2 pr-4 text-slate-300">{fmtNum(p.entryPrice, 5)}</td>
                  <td className="py-2 pr-4 text-slate-300">{fmtNum(p.currentPrice, 5)}</td>
                  <td className={`py-2 pr-4 font-medium ${p.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.unrealizedPnl >= 0 ? '+' : ''}
                    {fmtNum(p.unrealizedPnl)}
                  </td>
                  <td className="py-2 pr-4 text-slate-500">
                    {p.openedAt ? new Date(p.openedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
