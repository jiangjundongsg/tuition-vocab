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
  { href: '/words',      label: 'Word List' },
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
  // runs once on mount only
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="text-lg font-extrabold text-indigo-600 tracking-tight shrink-0">
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
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {isTeacher ? '👩‍🏫 ' : ''}{user.displayName ?? user.email.split('@')[0]}
                  {isTeacher && ' · Teacher'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md transition-colors"
                >
                  Sign up
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
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
        <div className="sm:hidden bg-white border-t border-slate-100 px-4 py-3 space-y-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100">
            {!loadingUser && (user ? (
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-md">
                Log out ({user.displayName ?? user.email.split('@')[0]})
              </button>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 text-sm font-medium border border-slate-200 rounded-md text-slate-600">Log in</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md">Sign up</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
