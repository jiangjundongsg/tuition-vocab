import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-10">

      {/* Hero */}
      <div className="text-center py-10 space-y-5">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide">
          English Vocabulary Practice
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
          Build your vocabulary<br />
          <span className="text-blue-700">one word at a time</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
          Practice English words with reading passages, AI-generated questions, fill-in-the-blank exercises, and dictation — all in one place.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/login"
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm"
          >
            Log In to Practice
          </Link>
          <Link
            href="/register"
            className="border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            href: '/practice',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            ),
            title: 'Word by Word',
            desc: 'Practice one word at a time — reading passage, MCQ, comprehension, and fill-in-the-blank.',
            color: 'text-blue-700 bg-blue-50',
          },
          {
            href: '/wrong-bank',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ),
            title: 'Tricky Words',
            desc: 'Wrong answers are saved for focused re-practice until you master them.',
            color: 'text-amber-600 bg-amber-50',
          },
          {
            href: '/upload',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
            title: 'Teacher Tools',
            desc: 'Upload word lists by lesson, manage words, and run SQL queries on your data.',
            color: 'text-emerald-600 bg-emerald-50',
          },
        ].map(({ href, icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              {icon}
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-900 mb-5">How it works</h2>
        <ol className="space-y-4">
          {[
            { n: '1', text: 'Teacher uploads a CSV word list — format: "1A,curious" for Lesson 1A, word "curious"' },
            { n: '2', text: 'Each word is automatically scored High, Medium, Low, or Unknown difficulty based on frequency data' },
            { n: '3', text: 'Student logs in, selects a lesson, and practices one word at a time' },
            { n: '4', text: 'For each word: read a Harry Potter passage, answer 4 questions (MCQ meaning, 2 comprehension, fill-in-blank)' },
            { n: '5', text: 'After all words, complete a dictation exercise. Incorrect answers are saved to Tricky Words for re-practice' },
          ].map(({ n, text }) => (
            <li key={n} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {n}
              </span>
              <span className="text-sm text-slate-600 leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
