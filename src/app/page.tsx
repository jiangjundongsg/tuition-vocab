import Link from 'next/link';

const features = [
  {
    href: '/practice',
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: 'Word by Word',
    desc: 'Read a passage, answer MCQ and comprehension questions, then fill in the blanks.',
    iconBg: 'bg-indigo-50 ring-1 ring-indigo-100',
    hover: 'hover:border-indigo-200/80',
    glow: 'group-hover:from-indigo-50/60',
  },
  {
    href: '/wrong-bank',
    icon: (
      <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Tricky Words',
    desc: 'Wrong answers are saved automatically and re-tested until you master them.',
    iconBg: 'bg-rose-50 ring-1 ring-rose-100',
    hover: 'hover:border-rose-200/80',
    glow: 'group-hover:from-rose-50/60',
  },
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Teacher Tools',
    desc: 'Upload word lists, manage your database, and run SQL queries on your data.',
    iconBg: 'bg-emerald-50 ring-1 ring-emerald-100',
    hover: 'hover:border-emerald-200/80',
    glow: 'group-hover:from-emerald-50/60',
  },
];

const steps = [
  { n: 1, text: 'Teacher uploads a CSV word list — format: "1A,curious" for Lesson 1A, word "curious"', dot: 'bg-indigo-500' },
  { n: 2, text: 'Each word is automatically scored High, Medium, Low, or Unknown difficulty based on word frequency data', dot: 'bg-violet-500' },
  { n: 3, text: 'Student logs in, selects a lesson, and practices one word at a time', dot: 'bg-sky-500' },
  { n: 4, text: 'For each word: read a passage, then answer 4 questions — MCQ meaning, 2 comprehension, and fill-in-blank', dot: 'bg-teal-500' },
  { n: 5, text: 'After all words, complete a dictation exercise. Wrong answers are re-tested inline before the session ends', dot: 'bg-emerald-500' },
];

export default function HomePage() {
  return (
    <div className="space-y-20">

      {/* Hero */}
      <div className="relative -mx-4 sm:-mx-6 px-8 sm:px-14 pt-16 pb-14 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50/80 to-sky-50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-200 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-200 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/3 right-1/3 w-56 h-56 bg-indigo-100 rounded-full opacity-30 blur-2xl pointer-events-none" />

        <div className="relative max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-indigo-100 rounded-full px-3.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            English Vocabulary Practice
          </div>

          <h1 className="text-5xl sm:text-6xl text-slate-900 leading-[1.06]">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-500 bg-clip-text text-transparent">
              Build your
            </span>
            <br />
            vocabulary
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed font-light">
            Practice with reading passages, AI-generated questions, fill-in-the-blank
            exercises, and dictation — all designed for primary school students.
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">What&apos;s inside</p>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {features.map(({ href, icon, title, desc, iconBg, hover, glow }) => (
            <Link
              key={href}
              href={href}
              className={`group relative bg-white rounded-2xl p-6 border border-slate-100 ${hover} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
                  {icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">How it works</p>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
        </div>

        <div className="relative pl-10">
          {/* Vertical connector */}
          <div className="absolute left-3 top-3 bottom-3 w-px bg-gradient-to-b from-indigo-200 via-violet-200 via-sky-200 to-emerald-200" />

          <div className="space-y-7">
            {steps.map(({ n, text, dot }) => (
              <div key={n} className="relative flex items-start gap-0">
                <div className={`absolute -left-10 w-6 h-6 rounded-full ${dot} flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white`}>
                  {n}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
