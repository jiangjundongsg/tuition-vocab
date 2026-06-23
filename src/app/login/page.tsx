'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isTeacherOnly = searchParams.get('message') === 'teacher-only';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-xl border border-stone-100 shadow-xl shadow-stone-200/60 p-8">

          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-stone-900 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl leading-none select-none">★</span>
            </div>
            <h1 className="text-2xl font-semibold text-stone-900">Welcome back</h1>
            <p className="text-stone-400 mt-1 text-sm">Log in to continue your learning</p>
          </div>

          {isTeacherOnly && (
            <div className="bg-amber-50 border border-amber-100 text-amber-700 rounded-xl px-4 py-3 mb-5 text-sm">
              That page is for teachers only. Please log in with a teacher account.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Email or username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoCapitalize="none"
                placeholder="your@email.com or username"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-stone-50/50 placeholder:text-stone-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-stone-50/50 placeholder:text-stone-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md mt-1"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>

            <p className="text-center">
              <Link href="/forgot-password" className="text-sm text-stone-400 hover:text-indigo-600 hover:underline transition-colors">
                Forgot your username or password?
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-stone-400 mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
