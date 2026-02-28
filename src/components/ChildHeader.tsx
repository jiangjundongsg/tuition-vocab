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

const studentNav = [
  { href: '/',            label: 'Home' },
  { href: '/practice',   label: 'Practice' },
  { href: '/wrong-bank', label: 'Tricky Words' },
];

const teacherNav = [
  { href: '/',            label: 'Home' },
  { href: '/practice',   label: 'Practice' },
  { href: '/wrong-bank', label: 'Tricky Words' },
  { href: '/words',      label: 'Manage Words' },
  { href: '/upload',     label: 'Upload' },
];

export default function ChildHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const navItems = isTeacher ? teacherNav : studentNav;

  return (
    <header className="bg-blue-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="text-lg font-extrabold text-white tracking-tight shrink-0">
          Vocab Star
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-0.5 flex-1">
          {navItems.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-100 hover:text-white hover:bg-blue-600'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth section */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {!loadingUser && (
            user ? (
              <>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isTeacher
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-600 text-blue-100'
                }`}>
                  {isTeacher ? '👩‍🏫 ' : ''}{user.displayName ?? user.email.split('@')[0]}
                  {isTeacher && ' · Teacher'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-blue-200 hover:text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-100 hover:text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 px-4 py-1.5 rounded-md transition-colors"
                >
                  Sign up
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 rounded-md text-blue-200 hover:bg-blue-600"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden bg-blue-800 border-t border-blue-600 px-4 py-3 space-y-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-blue-900 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-blue-600">
            {!loadingUser && (user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-blue-200 hover:bg-blue-700 hover:text-white rounded-md"
              >
                Log out ({user.displayName ?? user.email.split('@')[0]})
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-medium border border-blue-500 rounded-md text-blue-100"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-semibold bg-white text-blue-700 rounded-md"
                >
                  Sign up
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
