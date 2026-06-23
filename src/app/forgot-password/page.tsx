'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-8">

          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-200">
              <span className="text-white text-xl leading-none select-none">★</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Forgot password?</h1>
            <p className="text-slate-400 mt-1 text-sm">
              We&apos;ll email you a link to set a new one — the email also shows your sign-in username.
            </p>
          </div>

          {done ? (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm">
                If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its
                way. The link expires in 1 hour — check your inbox (and spam).
              </div>
              <Link
                href="/login"
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200"
              >
                Back to log in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50/50 placeholder:text-slate-300"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-200 mt-1"
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-400 mt-5">
          Remembered it?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
