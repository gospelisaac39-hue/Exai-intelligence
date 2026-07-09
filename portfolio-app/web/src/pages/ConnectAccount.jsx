import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import Shell from '../components/Shell.jsx';
import { Field, FormError } from '../components/AuthLayout.jsx';

const BROKERS = [
  { value: 'Exness', placeholder: 'e.g. Exness-MT5Real8' },
  { value: 'HFM', placeholder: 'e.g. HFMarketsGlobal-Live' },
  { value: 'FXTM', placeholder: 'e.g. FXTM-Real1' },
  { value: 'XM', placeholder: 'e.g. XMGlobal-Real 9' },
  { value: 'Other', placeholder: 'Exact server name from your broker' },
];

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

export default function ConnectAccount() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nickname: '',
    broker: 'Exness',
    server: '',
    login: '',
    investorPassword: '',
    platform: 'mt5',
  });
  const [phase, setPhase] = useState('form'); // form | connecting | stalled
  const [error, setError] = useState(null); // { message, code }
  const pollTimer = useRef(null);
  const pollDeadline = useRef(null);

  useEffect(() => () => clearTimeout(pollTimer.current), []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pollStatus = async (accountId) => {
    try {
      const { account } = await api.get(`/api/accounts/${accountId}`);
      if (account.status === 'active') {
        navigate('/', { replace: true });
        return;
      }
      if (account.status === 'error') {
        setError({ message: account.statusDetail || 'Connection failed while syncing your account.', code: 'unknown' });
        setPhase('form');
        return;
      }
      if (Date.now() > pollDeadline.current) {
        setPhase('stalled');
        return;
      }
      pollTimer.current = setTimeout(() => pollStatus(accountId), POLL_INTERVAL_MS);
    } catch (err) {
      setError({ message: err.message, code: 'unknown' });
      setPhase('form');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPhase('connecting');
    try {
      const { account } = await api.post('/api/accounts', form);
      pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
      pollStatus(account.id);
    } catch (err) {
      setError({ message: err.message, code: err instanceof ApiError ? err.code : 'unknown' });
      setPhase('form');
    }
  };

  const brokerMeta = BROKERS.find((b) => b.value === form.broker);

  return (
    <Shell>
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-lg font-semibold text-slate-100">Connect a broker account</h1>
        <p className="mb-6 text-sm text-slate-500">
          Uses your MT4/MT5 investor (read-only) login — never your main trading password.
        </p>

        <div className="rounded-xl border border-base-700 bg-base-900 p-6">
          {phase === 'connecting' && (
            <div className="py-10 text-center">
              <div className="mb-3 text-sm font-medium text-slate-200">Connecting to your broker…</div>
              <p className="text-sm text-slate-500">
                This can take up to a minute while MetaApi provisions and synchronizes your account.
              </p>
            </div>
          )}

          {phase === 'stalled' && (
            <div className="py-10 text-center">
              <div className="mb-3 text-sm font-medium text-slate-200">Still connecting…</div>
              <p className="mb-5 text-sm text-slate-500">
                This is taking longer than usual. It will keep syncing in the background — you can head to
                the dashboard and check back shortly.
              </p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-soft"
              >
                Go to dashboard
              </button>
            </div>
          )}

          {phase === 'form' && (
            <form onSubmit={onSubmit}>
              <FormError message={error?.message} />

              <Field label="Account nickname" required value={form.nickname} onChange={set('nickname')} />

              <label className="mb-4 block text-sm">
                <span className="mb-1.5 block font-medium text-slate-400">Broker</span>
                <select
                  className="w-full rounded-md border border-base-700 bg-base-850 px-3 py-2 text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  value={form.broker}
                  onChange={set('broker')}
                >
                  {BROKERS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.value}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Server"
                required
                placeholder={brokerMeta?.placeholder}
                value={form.server}
                onChange={set('server')}
              />

              <label className="mb-4 block text-sm">
                <span className="mb-1.5 block font-medium text-slate-400">Platform</span>
                <div className="flex gap-2">
                  {['mt4', 'mt5'].map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, platform: p }))}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium uppercase transition ${
                        form.platform === p
                          ? 'border-accent bg-accent-dim/40 text-slate-100'
                          : 'border-base-700 bg-base-850 text-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </label>

              <Field label="Account number (login)" required value={form.login} onChange={set('login')} />
              <Field
                label="Investor password"
                type="password"
                required
                value={form.investorPassword}
                onChange={set('investorPassword')}
              />

              <p className="mb-4 rounded-md border border-base-700 bg-base-850 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
                This is a read-only connection. EXAI cannot place, modify, or close trades — this is a
                platform-level restriction of the investor login itself, not a setting we control.
              </p>

              <button
                type="submit"
                className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft"
              >
                Connect account
              </button>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}
