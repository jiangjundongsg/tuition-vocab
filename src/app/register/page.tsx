'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
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
          <div className="text-5xl mb-3">🌟</div>
          <h1 className="text-3xl font-black text-purple-700">Join Vocab Star!</h1>
          <p className="text-gray-500 mt-1">Create your account and start your word adventure</p>
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
              😊 Your Name <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

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
              placeholder="At least 6 characters"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              🔒 Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Type your password again"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : '🚀 Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 font-bold hover:underline">
              Log in here!
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
