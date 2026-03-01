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
  { href: '/words',      label: 'SQL & Manage' },
  { href: '/upload',     label: 'Upload' },
];

export default function ChildHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLoadingUser(true);
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const navItems = isTeacher ? teacherNav : studentNav;

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-slate-100 shadow-[0_1px_0_0_#e2e8f0]">
      {/* Colour accent strip */}
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
            </svg>
          </span>
          <span className="text-base font-bold text-slate-900 tracking-tight">Vocab Star</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {navItems.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  isTeacher
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                }`}>
                  {user.displayName ?? user.email.split('@')[0]}
                  {isTeacher && ' · Teacher'}
                </span>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-0.5">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-3 mt-2 border-t border-slate-100">
            {!loadingUser && (user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log out ({user.displayName ?? user.email.split('@')[0]})
              </button>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg"
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
