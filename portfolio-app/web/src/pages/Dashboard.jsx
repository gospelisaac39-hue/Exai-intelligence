import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Shell from '../components/Shell.jsx';
import SummaryBar from '../components/SummaryBar.jsx';
import ExposurePanel from '../components/ExposurePanel.jsx';
import PerformanceList from '../components/PerformanceList.jsx';
import PositionsTable from '../components/PositionsTable.jsx';
import InsightsFeed from '../components/InsightsFeed.jsx';
import EconomicCalendar from '../components/EconomicCalendar.jsx';
import IntelligencePanel from '../components/IntelligencePanel.jsx';

// Spec Section 6: no accounts connected must show ONE connect CTA card,
// never six empty/zero portfolio modules — the market layer above
// already fills the page with real content.
function ConnectAccountCTA() {
  return (
    <div className="rounded-xl border border-dashed border-base-700 bg-base-900/40 p-6 text-center">
      <div className="text-sm font-medium text-slate-200">See your book scored against today's bias</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Connect a read-only investor login and EXAI scores your trades against the market intelligence above — with
        or without a connection, EXAI can never place, modify, or close a trade.
      </p>
      <Link
        to="/connect"
        className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft"
      >
        + Connect Your First Account
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState(null);
  const [summary, setSummary] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [positions, setPositions] = useState([]);
  const [exposure, setExposure] = useState(null);
  const [insights, setInsights] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = useCallback(async () => {
    try {
      const { accounts } = await api.get('/api/accounts');
      setAccounts(accounts);
    } catch (err) {
      setError(err.message || 'Unable to load accounts');
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const loadDashboardData = useCallback(async () => {
    const [summaryRes, positionsRes, exposureRes, insightsRes, calendarRes, intelligenceRes] = await Promise.allSettled([
      api.get('/api/dashboard/summary'),
      api.get('/api/positions'),
      api.get('/api/exposure'),
      api.get('/api/insights'),
      api.get('/api/calendar'),
      api.get('/api/intelligence'),
    ]);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    if (positionsRes.status === 'fulfilled') setPositions(positionsRes.value.positions);
    if (exposureRes.status === 'fulfilled') setExposure(exposureRes.value);
    if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.insights);
    if (calendarRes.status === 'fulfilled') setCalendar(calendarRes.value);
    if (intelligenceRes.status === 'fulfilled') setIntelligence(intelligenceRes.value);
  }, []);

  const loadPerformance = useCallback(async (p) => {
    try {
      const res = await api.get(`/api/dashboard/performance?period=${p}`);
      setPerformance(res);
    } catch (err) {
      // non-fatal — leave previous performance state in place
    }
  }, []);

  useEffect(() => {
    if (accounts === null) return;
    loadDashboardData();
    // The pipeline ticks every 15 min; poll well inside that window so
    // the dashboard (especially the Intelligence panel) reflects a new
    // run without requiring a manual refresh.
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [accounts, loadDashboardData]);

  useEffect(() => {
    if (accounts !== null) {
      loadPerformance(period);
    }
  }, [accounts, period, loadPerformance]);

  const refreshInsights = async () => {
    setRefreshingInsights(true);
    try {
      const { insights } = await api.post('/api/insights/refresh', {});
      setInsights(insights);
    } catch (err) {
      setError(err.message || 'Unable to refresh insights');
    } finally {
      setRefreshingInsights(false);
    }
  };

  const hasAccounts = accounts !== null && accounts.length > 0;

  return (
    <Shell>
      {error && (
        <div className="mb-6 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-100">EXAI Terminal</h1>
          {hasAccounts && (
            <Link
              to="/connect"
              className="rounded-md border border-base-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-accent hover:text-accent-soft"
            >
              + Connect account
            </Link>
          )}
        </div>

        {/* Market layer — always alive, zero accounts required */}
        <IntelligencePanel intelligence={intelligence} />

        {/* Portfolio strip — the premium upgrade moment, not the entry requirement */}
        {accounts === null ? null : !hasAccounts ? (
          <ConnectAccountCTA />
        ) : (
          <div className="space-y-6">
            <SummaryBar summary={summary} />
            <ExposurePanel exposure={exposure} riskGauge={intelligence?.riskGauge} />
            <PerformanceList performance={performance} period={period} onPeriodChange={setPeriod} />
            <PositionsTable positions={positions} />
            <InsightsFeed
              insights={insights}
              onRefresh={refreshInsights}
              refreshing={refreshingInsights}
              marketNewsFeed={intelligence?.newsFeed}
            />
            <EconomicCalendar calendar={calendar} />
          </div>
        )}
      </div>
    </Shell>
  );
}
