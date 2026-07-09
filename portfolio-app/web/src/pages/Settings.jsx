import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Shell from '../components/Shell.jsx';
import AssetPicker from '../components/AssetPicker.jsx';

export default function Settings() {
  const [catalog, setCatalog] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get('/api/assets')
      .then(({ catalog, watched }) => {
        setCatalog(catalog);
        setAssets(watched);
      })
      .catch((err) => setError(err.message || 'Unable to load assets'))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async () => {
    setError('');
    setSaved(false);
    if (assets.length === 0) {
      setError('Select at least one asset you trade');
      return;
    }
    setSaving(true);
    try {
      const { watched } = await api.put('/api/assets', { symbols: assets });
      setAssets(watched);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>

        <div className="rounded-xl border border-base-700 bg-base-900 p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-100">Watched Assets</h2>
          <p className="mb-4 text-sm text-slate-500">
            EXAI Intelligence shows analysis and live prices for these assets on your dashboard.
          </p>

          {error && (
            <div className="mb-4 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {saved && (
            <div className="mb-4 rounded-md border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
              Saved.
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              <AssetPicker catalog={catalog} selected={assets} onChange={setAssets} />
              <button
                onClick={onSave}
                disabled={saving}
                className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
