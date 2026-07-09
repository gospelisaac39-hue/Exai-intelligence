import React, { useState } from 'react';
import { IMPACT_COLORS, formatRelativeTime } from '../lib/format';

function ImpactChip({ impact }) {
  const colors = IMPACT_COLORS[impact] || IMPACT_COLORS.LOW;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${colors.text} ${colors.bg} ${colors.border}`}>
      {impact}
    </span>
  );
}

function AssetArrow({ asset }) {
  const isUp = asset.direction === 'up';
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono ${isUp ? 'border-emerald-900/50 text-emerald-400' : 'border-red-900/50 text-red-400'}`}>
      {asset.symbol}
      {isUp ? '↑' : '↓'}
    </span>
  );
}

// Protected module (spec Section 0.1) — must always render.
export default function NewsFeed({ items, updatedAt, watchedSymbols }) {
  const [impactFilter, setImpactFilter] = useState('ALL');
  const [watchedOnly, setWatchedOnly] = useState(false);

  const watchedSet = new Set(watchedSymbols || []);
  const filtered = (items || []).filter((item) => {
    if (impactFilter !== 'ALL' && item.impact !== impactFilter) return false;
    if (watchedOnly && !item.affectedAssets.some((a) => watchedSet.has(a.symbol))) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">AI News Feed</h2>
        <span className="text-xs text-slate-500">{updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : ''}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
          <button
            key={level}
            onClick={() => setImpactFilter(level)}
            className={`rounded border px-2 py-1 text-[10px] font-medium uppercase transition ${
              impactFilter === level ? 'border-accent text-accent-soft' : 'border-base-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {level}
          </button>
        ))}
        <button
          onClick={() => setWatchedOnly((v) => !v)}
          className={`ml-auto rounded border px-2 py-1 text-[10px] font-medium transition ${
            watchedOnly ? 'border-accent text-accent-soft' : 'border-base-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          Watchlist only
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {items && items.length > 0 ? 'No headlines match this filter.' : 'No market-moving headlines yet — checking every 15 minutes.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 12).map((item, i) => (
            <div key={i} className="border-b border-base-700 pb-3 last:border-0 last:pb-0">
              <div className="mb-1 flex items-center gap-2">
                <ImpactChip impact={item.impact} />
                <span className="text-[10px] text-slate-500">{formatRelativeTime(item.pubDate)}</span>
              </div>
              <a href={item.link || '#'} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-100 hover:underline">
                {item.title}
              </a>
              <p className="mt-1 text-xs text-slate-400">{item.oneLineWhy}</p>
              {item.affectedAssets && item.affectedAssets.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.affectedAssets.map((a) => (
                    <AssetArrow key={a.symbol} asset={a} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
