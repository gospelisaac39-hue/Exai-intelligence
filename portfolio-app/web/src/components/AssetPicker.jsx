import React from 'react';

export default function AssetPicker({ catalog, selected, onChange }) {
  const toggle = (symbol) => {
    if (selected.includes(symbol)) {
      onChange(selected.filter((s) => s !== symbol));
    } else {
      onChange([...selected, symbol]);
    }
  };

  const groups = catalog.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  if (catalog.length === 0) {
    return <p className="text-sm text-slate-500">Loading assets…</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">{category}</div>
          <div className="flex flex-wrap gap-2">
            {items.map((a) => {
              const isSelected = selected.includes(a.symbol);
              return (
                <button
                  type="button"
                  key={a.symbol}
                  onClick={() => toggle(a.symbol)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition ${
                    isSelected
                      ? 'border-accent bg-accent-dim/40 text-slate-100'
                      : 'border-base-700 bg-base-850 text-slate-400 hover:border-base-700/80'
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
