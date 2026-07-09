import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import logo from '../assets/logo.png';

export default function Shell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-base-950">
      <header className="border-b border-base-700 bg-base-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="EXAICOM Intelligence" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold tracking-wide text-slate-100">EXAI</span>
            <span className="text-sm text-slate-500">Portfolio Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/settings"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              Settings
            </Link>
            <span className="text-sm text-slate-400">{user?.displayName}</span>
            <button
              onClick={logout}
              className="rounded-md border border-base-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-base-700/80 hover:text-slate-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
