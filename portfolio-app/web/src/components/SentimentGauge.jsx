import React from 'react';
import { formatRelativeTime } from '../lib/format';

const SEGMENTS = [
  { max: 20, label: 'Panic Selling', color: '#EF4444' },
  { max: 40, label: 'Fear', color: '#F97316' },
  { max: 60, label: 'Neutral', color: '#94A3B8' },
  { max: 80, label: 'Optimism', color: '#34D399' },
  { max: 100, label: 'Speculative Euphoria', color: '#10B981' },
];

function colorForScore(score) {
  return (SEGMENTS.find((s) => score <= s.max) || SEGMENTS[SEGMENTS.length - 1]).color;
}

// Protected module (spec Section 0.1) — must always render.
export default function SentimentGauge({ sentiment, updatedAt }) {
  const score = sentiment?.score ?? 50;
  const label = sentiment?.label || 'Neutral';
  const color = colorForScore(score);

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Sentiment Gauge</h2>
        <span className="text-xs text-slate-500">{updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : ''}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold" style={{ color }}>
          {score}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color }}>
            {label}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wide text-slate-600">
            <span>Panic</span>
            <span>Fear</span>
            <span>Neutral</span>
            <span>Optimism</span>
            <span>Euphoria</span>
          </div>
        </div>
      </div>

      {sentiment?.factors && sentiment.factors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sentiment.factors.map((f, i) => (
            <span key={i} className="rounded border border-base-700 px-2 py-1 text-[10px] text-slate-400">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
