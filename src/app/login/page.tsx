'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔤</div>
          <h1 className="text-3xl font-black text-purple-700">Welcome Back!</h1>
          <p className="text-gray-500 mt-1">Log in to continue your word adventure</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-xl p-8 space-y-5 border-2 border-purple-100"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              📧 Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              🔒 Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : '✨ Log In'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-purple-600 font-bold hover:underline">
              Sign up here!
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
