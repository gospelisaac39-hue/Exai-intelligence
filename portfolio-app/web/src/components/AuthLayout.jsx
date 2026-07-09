import React from 'react';
import logo from '../assets/logo.png';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <img src={logo} alt="EXAICOM Intelligence" className="mx-auto mb-3 h-96 w-96 max-w-full object-contain" />
          <h1 className="mt-3 text-xl font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-base-700 bg-base-900 p-6 shadow-xl shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {message}
    </div>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="mb-4 block text-sm">
      <span className="mb-1.5 block font-medium text-slate-400">{label}</span>
      <input
        className="w-full rounded-md border border-base-700 bg-base-850 px-3 py-2 text-slate-100 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
        {...props}
      />
    </label>
  );
}

export function SubmitButton({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
