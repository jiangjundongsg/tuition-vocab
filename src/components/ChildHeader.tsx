'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  displayName: string | null;
}

const navItems = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/upload', label: 'Upload Words', emoji: '📚' },
  { href: '/practice', label: 'Practice', emoji: '✏️' },
  { href: '/wrong-bank', label: 'My Tricky Words', emoji: '🌟' },
];

export default function ChildHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  // Intentionally only runs once on mount; login/logout update `user` state directly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-400 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="text-white text-2xl font-black tracking-tight drop-shadow">
            🔤 Vocab Star
          </Link>

          <nav className="flex flex-wrap gap-2 justify-center">
            {navItems.map(({ href, label, emoji }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 ${
                    active
                      ? 'bg-white text-purple-600 shadow-md scale-105'
                      : 'bg-white/20 text-white hover:bg-white/40'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!loadingUser && (
              user ? (
                <>
                  <span className="text-white text-sm font-bold bg-white/20 px-3 py-1.5 rounded-full">
                    👋 {user.displayName ?? user.email.split('@')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-white/20 text-white text-sm font-bold px-3 py-1.5 rounded-full hover:bg-white/40 transition-all"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 ${
                      pathname === '/login'
                        ? 'bg-white text-purple-600 shadow-md scale-105'
                        : 'bg-white/20 text-white hover:bg-white/40'
                    }`}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 ${
                      pathname === '/register'
                        ? 'bg-white text-purple-600 shadow-md scale-105'
                        : 'bg-white text-purple-600 hover:scale-105 shadow-sm'
                    }`}
                  >
                    Sign Up
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
