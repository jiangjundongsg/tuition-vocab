import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-16">

      {/* Hero — gradient background */}
      <div className="relative -mx-4 px-4 pt-12 pb-10 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-200 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-200 rounded-full opacity-25 blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative space-y-5">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
            English Vocabulary Practice
          </p>
          <h1 className="text-5xl sm:text-6xl text-slate-900 leading-[1.1]">
            Build your vocabulary,<br />
            <span className="italic bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              one word at a time
            </span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl leading-relaxed font-light">
            Practice with reading passages, AI-generated questions, fill-in-the-blank exercises,
            and dictation — all designed for primary school students.
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">What&apos;s inside</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              href: '/practice',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ),
              title: 'Word by Word',
              desc: 'Read a passage, answer MCQ and comprehension questions, then fill in the blanks.',
              iconBg: 'bg-indigo-100 text-indigo-600',
              border: 'hover:border-indigo-200',
            },
            {
              href: '/wrong-bank',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ),
              title: 'Tricky Words',
              desc: 'Wrong answers are saved automatically and re-tested until you master them.',
              iconBg: 'bg-rose-100 text-rose-500',
              border: 'hover:border-rose-200',
            },
            {
              href: '/upload',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: 'Teacher Tools',
              desc: 'Upload word lists, manage your database, and run SQL queries on your data.',
              iconBg: 'bg-emerald-100 text-emerald-600',
              border: 'hover:border-emerald-200',
            },
          ].map(({ href, icon, title, desc, iconBg, border }) => (
            <Link
              key={href}
              href={href}
              className={`group bg-white rounded-2xl p-5 border border-slate-100 ${border} hover:shadow-md transition-all duration-200`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
                {icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">How it works</p>
        <div className="space-y-5">
          {[
            { n: '01', text: 'Teacher uploads a CSV word list — format: "1A,curious" for Lesson 1A, word "curious"', color: 'text-indigo-400' },
            { n: '02', text: 'Each word is automatically scored High, Medium, Low, or Unknown difficulty based on frequency data', color: 'text-violet-400' },
            { n: '03', text: 'Student logs in, selects a lesson, and practices one word at a time', color: 'text-sky-400' },
            { n: '04', text: 'For each word: read a passage, answer 4 questions (MCQ meaning, 2 comprehension, fill-in-blank)', color: 'text-teal-400' },
            { n: '05', text: 'After all words, complete a dictation exercise. Incorrect answers are re-tested inline before the session ends', color: 'text-emerald-400' },
          ].map(({ n, text, color }) => (
            <div key={n} className="flex gap-5 items-start">
              <span className={`text-xs font-bold w-6 shrink-0 pt-0.5 tabular-nums ${color}`}>{n}</span>
              <span className="text-sm text-slate-600 leading-relaxed">{text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
