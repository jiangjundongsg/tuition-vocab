'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setError('This page needs a valid reset link — request a new one below.'); return; }
    setBusy(true);
    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Could not reset your password.'); return; }
    setDone(true);
    setTimeout(() => router.push('/login'), 1800);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-stone-100 shadow-xl shadow-stone-200/60 p-8">

          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl leading-none select-none">★</span>
            </div>
            <h1 className="text-2xl font-semibold text-stone-900">Set a new password</h1>
            <p className="text-stone-400 mt-1 text-sm">Choose a new password for your account</p>
          </div>

          {done ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              Password updated. Redirecting you to log in…
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  New password
                </label>
                <input
                  type="password" required minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-stone-50/50 placeholder:text-stone-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password" required minLength={6}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-stone-50/50 placeholder:text-stone-300"
                />
              </div>
              <button
                type="submit" disabled={busy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md mt-1"
              >
                {busy ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-stone-400 mt-5">
          Need a new link?{' '}
          <Link href="/forgot-password" className="text-indigo-600 font-semibold hover:underline">
            Request a reset
          </Link>
        </p>
      </div>
    </div>
  );
}
