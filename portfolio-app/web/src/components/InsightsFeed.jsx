import React from 'react';

export default function InsightsFeed({ insights, onRefresh, refreshing, marketNewsFeed }) {
  const fallbackItems = (marketNewsFeed || []).slice(0, 3);

  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">AI Insights</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs font-medium text-accent-soft hover:underline disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!insights || insights.length === 0 ? (
        fallbackItems.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">No personal trade insights yet — today's market insights instead:</p>
            {fallbackItems.map((item, i) => (
              <div key={i} className="rounded-md border border-base-700 bg-base-850 p-4">
                <div className="mb-1 text-sm font-medium text-slate-200">{item.title}</div>
                <p className="text-sm leading-relaxed text-slate-400">{item.oneLineWhy}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Today's market insights will appear here once the pipeline's next tick completes.</p>
        )
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-md border border-base-700 bg-base-850 p-4">
              <div className="mb-1 text-sm font-medium text-slate-200">{insight.headline}</div>
              <p className="text-sm leading-relaxed text-slate-400">{insight.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
