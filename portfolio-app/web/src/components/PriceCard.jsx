import React from 'react';
import { formatPrice, formatChange, BIAS_COLORS } from '../lib/format';

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function SessionRangeBar({ price, dayLow, dayHigh, precision }) {
  if (price == null || dayLow == null || dayHigh == null || dayHigh === dayLow) return null;
  const pct = Math.max(0, Math.min(100, ((price - dayLow) / (dayHigh - dayLow)) * 100));
  return (
    <div className="mt-2">
      <div className="relative h-1 rounded-full bg-white/10">
        <div className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" style={{ left: `calc(${pct}% - 4px)` }} />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-slate-500">
        <span>{formatPrice(dayLow, precision)}</span>
        <span>{formatPrice(dayHigh, precision)}</span>
      </div>
    </div>
  );
}

export default function PriceCard({ asset }) {
  const price = asset.price;
  const change = price ? formatChange(price.changeAbsolute, price.changePercent, asset.precision) : { text: '—', sign: 'flat' };
  const changeColor = change.sign === 'up' ? '#34D399' : change.sign === 'down' ? '#FB7185' : '#94A3B8';
  const dayBias = asset.bias?.dayBias;
  const biasColors = dayBias ? BIAS_COLORS[dayBias] : null;

  return (
    <div className="rounded-lg border border-base-700 bg-base-850 p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">{asset.label}</span>
        {dayBias ? (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${biasColors.text} ${biasColors.bg} ${biasColors.border}`}>
            {dayBias}
          </span>
        ) : (
          <span className="rounded-full border border-base-700 px-2 py-0.5 text-[10px] uppercase text-slate-500">Watching</span>
        )}
      </div>

      {price ? (
        <>
          <div className="text-xl font-semibold text-slate-100">{formatPrice(price.price, asset.precision)}</div>
          <div className="text-xs font-medium" style={{ color: changeColor }}>
            {change.text}
          </div>
          <Sparkline points={price.sparkline} color={changeColor} />
          <SessionRangeBar price={price.price} dayLow={price.dayLow} dayHigh={price.dayHigh} precision={asset.precision} />
        </>
      ) : (
        <p className="text-xs text-slate-500">Price feed loading…</p>
      )}

      {asset.bias?.reason && <p className="mt-2 text-xs leading-relaxed text-slate-400">{asset.bias.reason}</p>}
    </div>
  );
}
