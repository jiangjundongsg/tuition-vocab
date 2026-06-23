'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: string;
  status: string;
}

const studentNav = [
  { href: '/',             label: 'Home' },
  { href: '/practice',     label: 'Practice' },
  { href: '/dictation',    label: 'Dictation' },
  { href: '/wrong-bank',   label: 'Tricky Words' },
  { href: '/mistake-pick', label: 'Mistake Pick' },
];

const teacherNav = [
  { href: '/',       label: 'Home' },
  { href: '/words',  label: 'Teacher Tools' },
];

const Star = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

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
  // Students awaiting (or denied) approval can't practice yet — show Home only.
  const isPendingStudent = user?.role === 'student' && user.status !== 'approved';
  const navItems = isTeacher ? teacherNav : (isPendingStudent ? [{ href: '/', label: 'Home' }] : studentNav);
  const displayName = user?.displayName ?? user?.username ?? user?.email?.split('@')[0] ?? '';

  return (
    <header className="sticky top-0 z-50 bg-[#faf8f2]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-display text-lg text-stone-900 tracking-tight leading-none">Vocab Star</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 flex-1 justify-center">
          {navItems.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-1.5 text-sm tracking-tight transition-colors ${
                  active
                    ? 'text-stone-900 font-semibold'
                    : 'text-stone-500 hover:text-stone-900 font-medium'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute -bottom-px left-3 right-3 h-0.5 bg-indigo-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth section — desktop */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {!loadingUser && (
            user ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                  {displayName}
                  {isTeacher && <span className="text-stone-400">· Teacher</span>}
                </span>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-stone-900 hover:bg-stone-700 px-4 py-1.5 rounded-md transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 -mr-2 rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
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
        <div className="sm:hidden border-t border-stone-200 bg-[#faf8f2] px-4 py-3 space-y-0.5">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
                pathname === href
                  ? 'bg-stone-100 text-stone-900 font-semibold'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 font-medium'
              }`}
            >
              {pathname === href && <span className="w-1 h-4 rounded-full bg-indigo-600 mr-2.5" />}
              {label}
            </Link>
          ))}
          <div className="pt-3 mt-1 border-t border-stone-200 space-y-2">
            {!loadingUser && (user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-md transition-colors"
              >
                Sign out ({displayName})
              </button>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-medium border border-stone-200 rounded-md text-stone-700 hover:bg-stone-50 transition-colors">
                  Log in
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center py-2.5 text-sm font-semibold bg-stone-900 text-white rounded-md">
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
