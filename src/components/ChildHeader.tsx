'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
}

const studentNavItems = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/practice', label: 'Practice', emoji: '✏️' },
  { href: '/wrong-bank', label: 'My Tricky Words', emoji: '🌟' },
];

const teacherNavItems = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/practice', label: 'Practice', emoji: '✏️' },
  { href: '/wrong-bank', label: 'My Tricky Words', emoji: '🌟' },
  { href: '/words', label: 'Manage Words', emoji: '📋' },
  { href: '/upload', label: 'Upload', emoji: '📤' },
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
  // Intentionally only runs once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <header className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="text-white text-2xl font-black tracking-tight drop-shadow">
            🔤 Vocab Star
          </Link>

          <nav className="flex flex-wrap gap-1.5 justify-center">
            {navItems.map(({ href, label, emoji }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'bg-white/20 text-white hover:bg-white/35'
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
                  <span className={`text-white text-xs font-bold px-3 py-1.5 rounded-full ${isTeacher ? 'bg-yellow-400/80' : 'bg-white/20'}`}>
                    {isTeacher ? '👩‍🏫' : '👋'} {user.displayName ?? user.email.split('@')[0]}
                    {isTeacher && <span className="ml-1 opacity-80">(Teacher)</span>}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-white/40 transition-all"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                      pathname === '/login'
                        ? 'bg-white text-purple-600 shadow-md'
                        : 'bg-white/20 text-white hover:bg-white/35'
                    }`}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                      pathname === '/register'
                        ? 'bg-white text-purple-600 shadow-md'
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
