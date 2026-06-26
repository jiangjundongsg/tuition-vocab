import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

const studentFeatures = [
  { href: '/practice', title: 'Practice', desc: 'AI passages, MCQs, fill-in-the-blank — one word at a time.', color: 'indigo' },
  { href: '/dictation', title: 'Dictation', desc: 'Listen and type each word spoken aloud.', color: 'sky' },
  { href: '/mistake-pick', title: 'Mistake Pick', desc: 'Find and fix grammar mistakes in sentences.', color: 'purple' },
  { href: '/wrong-bank', title: 'Tricky Words', desc: 'Wrong answers saved and re-tested until mastered.', color: 'rose' },
];

const teacherFeatures = [
  { href: '/words', title: 'Upload Words', desc: 'CSV, photo, or PDF — upload lists, assign to students.', color: 'indigo' },
  { href: '/words', title: 'Manage Students', desc: 'Create accounts, configure questions, track progress.', color: 'emerald' },
];

const colors: Record<string, { bg: string; text: string; ring: string; hover: string }> = {
  indigo:  { bg:'bg-indigo-50', text:'text-indigo-600', ring:'ring-indigo-100', hover:'hover:border-indigo-200' },
  sky:     { bg:'bg-sky-50',    text:'text-sky-600',    ring:'ring-sky-100',    hover:'hover:border-sky-200' },
  purple:  { bg:'bg-purple-50', text:'text-purple-600', ring:'ring-purple-100', hover:'hover:border-purple-200' },
  rose:    { bg:'bg-rose-50',   text:'text-rose-600',   ring:'ring-rose-100',   hover:'hover:border-rose-200' },
  emerald: { bg:'bg-emerald-50',text:'text-emerald-600',ring:'ring-emerald-100',hover:'hover:border-emerald-200' },
};

export default async function HomePage() {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isPending = user?.role === 'student' && user?.status !== 'approved';

  if (isPending) {
    const rejected = user.status === 'rejected';
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md text-center bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-10">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${rejected?'bg-red-50':'bg-amber-50'}`}>
            <span className="text-3xl">{rejected?'🚫':'⏳'}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{rejected?'Request not approved':'Waiting for approval'}</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {rejected?'Your teacher did not approve this account.':'Your account is set up! Your teacher just needs to approve you. Check back soon.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-20">
      {/* Hero */}
      <section className="relative -mx-4 sm:-mx-6 px-4 sm:px-14 pt-12 sm:pt-20 pb-10 sm:pb-16 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50/60 to-sky-50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-200 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-200 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-slate-200/60 text-xs font-semibold text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> AI-powered vocabulary practice
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Master English vocabulary<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">one word at a time</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
            AI generates personalised passages, questions, and dictation exercises for every word. Practice → Dictation → Tricky Words → Mistake Pick — four steps to mastery.
          </p>
          {!isLoggedIn ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/register" className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-indigo-200">Get Started Free</Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-3 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-sm transition-colors shadow-sm">Log in</Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400 pt-2">Welcome back, <strong className="text-slate-700">{user.displayName ?? user.username ?? user.email}</strong></p>
          )}
        </div>
      </section>

      {/* Public: For Teachers + For Learners */}
      {!isLoggedIn && (
        <section className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">For Teachers</h2>
            <ul className="space-y-2 text-sm text-slate-500 mb-5">
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5 shrink-0">✓</span>Upload word lists as CSV, photo, or PDF</li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5 shrink-0">✓</span>Create student accounts and track progress</li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5 shrink-0">✓</span>Configure question types per student</li>
            </ul>
            <Link href="/register" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800">Sign up as Teacher →</Link>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">For Learners</h2>
            <ul className="space-y-2 text-sm text-slate-500 mb-5">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5 shrink-0">✓</span>AI reads with you, tests you, fixes your mistakes</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5 shrink-0">✓</span>MCQs, dictation, and fill-in-the-blank exercises</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5 shrink-0">✓</span>Tricky words saved and re-tested until mastered</li>
            </ul>
            <Link href="/register" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800">Sign up as Student →</Link>
          </div>
        </section>
      )}

      {/* Features (logged-in only) */}
      {isLoggedIn && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-100 to-amber-100" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">{isTeacher ? 'Teacher Tools' : 'Practice'}</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-100 to-amber-100" />
          </div>
          <div className={`grid gap-4 ${isTeacher ? 'sm:grid-cols-2' : 'sm:grid-cols-4'}`}>
            {(isTeacher ? teacherFeatures : studentFeatures).map(({ href, title, desc, color }) => {
              const cl = colors[color];
              return (
                <Link key={title} href={href} className={`group relative bg-white rounded-2xl p-6 border border-slate-100 ${cl.hover} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}>
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-4 font-bold text-sm ${cl.bg} ${cl.text} ${cl.ring}`}>{title[0]}</span>
                  <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom CTA — public only */}
      {!isLoggedIn && (
        <section className="text-center pb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-white shadow-xl shadow-indigo-200/40">
            <h2 className="text-xl sm:text-3xl font-bold mb-3">Ready to start learning?</h2>
            <p className="text-indigo-100 text-xs sm:text-base max-w-md mx-auto mb-6">
              Create an account and start practising today.
            </p>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-indigo-700 font-semibold rounded-xl text-sm hover:bg-indigo-50 transition-colors shadow-lg">Create Account →</Link>
          </div>
        </section>
      )}
    </div>
  );
}
