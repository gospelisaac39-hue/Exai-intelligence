import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../api/client';
import AuthLayout, { FormError, SubmitButton } from '../components/AuthLayout.jsx';
import AssetPicker from '../components/AssetPicker.jsx';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];

const TRADER_TYPES = [
  { value: 'independent_trader', label: 'Independent Trader' },
  { value: 'portfolio_manager', label: 'Portfolio Manager' },
  { value: 'prop_firm_trader', label: 'Prop Firm Trader' },
  { value: 'investment_club', label: 'Investment Club' },
];

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [traderType, setTraderType] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get('/api/assets')
      .then(({ catalog }) => setCatalog(catalog))
      .catch(() => setCatalog([]));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (assets.length === 0) {
      setError('Select at least one asset you trade');
      return;
    }
    setLoading(true);
    try {
      await completeOnboarding({ baseCurrency, traderType: traderType || undefined, assets });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="A few details" subtitle="Used only to personalize your dashboard">
      <form onSubmit={onSubmit}>
        <FormError message={error} />

        <label className="mb-5 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-400">Base currency</span>
          <select
            className="w-full rounded-md border border-base-700 bg-base-850 px-3 py-2 text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-6">
          <span className="mb-2 block text-sm font-medium text-slate-400">Which assets do you trade?</span>
          <AssetPicker catalog={catalog} selected={assets} onChange={setAssets} />
        </div>

        <div className="mb-6">
          <span className="mb-2 block text-sm font-medium text-slate-400">What best describes you? (optional)</span>
          <div className="grid grid-cols-2 gap-2">
            {TRADER_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setTraderType(traderType === t.value ? '' : t.value)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                  traderType === t.value
                    ? 'border-accent bg-accent-dim/40 text-slate-100'
                    : 'border-base-700 bg-base-850 text-slate-400 hover:border-base-700/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <SubmitButton loading={loading}>Continue</SubmitButton>
      </form>
    </AuthLayout>
  );
}
