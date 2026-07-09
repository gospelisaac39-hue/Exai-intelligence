// Centralized number/time formatting — spec Section 5: "driven by
// asset config precision, no inline .toFixed() scattered in components."

export function formatPrice(value, precision = 4) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision });
}

export function formatChange(absolute, percent, precision = 4) {
  if (absolute === null || absolute === undefined || Number.isNaN(absolute)) {
    return { text: '—', sign: 'flat' };
  }
  const sign = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat';
  const arrow = sign === 'up' ? '▲' : sign === 'down' ? '▼' : '▬';
  const absText = formatPrice(Math.abs(absolute), precision);
  const pctText = percent === null || percent === undefined ? '' : ` (${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%)`;
  return { text: `${arrow} ${absText}${pctText}`, sign };
}

// Relative under 24h ("14 min ago"), absolute after — spec Section 5.
export function formatRelativeTime(isoString) {
  if (!isoString) return null;
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  return new Date(then).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Shared bias/impact/sentiment color scale — spec Section 5: "one
// semantic scale, no random greens/reds."
export const BIAS_COLORS = {
  Bearish: { text: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-900/50' },
  'Slightly Bearish': { text: 'text-red-300', bg: 'bg-red-950/20', border: 'border-red-900/30' },
  Neutral: { text: 'text-slate-400', bg: 'bg-base-850', border: 'border-base-700' },
  'Slightly Bullish': { text: 'text-emerald-300', bg: 'bg-emerald-950/20', border: 'border-emerald-900/30' },
  Bullish: { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-900/50' },
};

export const IMPACT_COLORS = {
  HIGH: { text: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-900/50' },
  MEDIUM: { text: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-900/50' },
  LOW: { text: 'text-slate-500', bg: 'bg-base-850', border: 'border-base-700' },
};
