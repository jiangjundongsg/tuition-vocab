import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

const studentFeatures = [
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
    href: '/dictation',
    icon: (
      <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Dictation',
    desc: 'Listen to each word spoken aloud and type it correctly to complete the lesson.',
    iconBg: 'bg-sky-50 ring-1 ring-sky-100',
    hover: 'hover:border-sky-200/80',
    glow: 'group-hover:from-sky-50/60',
  },
  {
    href: '/mistake-pick',
    icon: (
      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    title: 'Mistake Pick',
    desc: 'Find and correct grammar mistakes in sentences — like the gaokao error-correction section.',
    iconBg: 'bg-purple-50 ring-1 ring-purple-100',
    hover: 'hover:border-purple-200/80',
    glow: 'group-hover:from-purple-50/60',
  },
];

const teacherFeatures = [
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Upload Words',
    desc: 'Upload a CSV, photo, or PDF word list and assign it to one or more students.',
    iconBg: 'bg-indigo-50 ring-1 ring-indigo-100',
    hover: 'hover:border-indigo-200/80',
    glow: 'group-hover:from-indigo-50/60',
  },
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Manage Users',
    desc: 'Edit student profiles, configure question types, and manage accounts.',
    iconBg: 'bg-emerald-50 ring-1 ring-emerald-100',
    hover: 'hover:border-emerald-200/80',
    glow: 'group-hover:from-emerald-50/60',
  },
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16" />
      </svg>
    ),
    title: 'SQL Portal',
    desc: 'Run SELECT, INSERT, UPDATE, DELETE queries directly on the database.',
    iconBg: 'bg-amber-50 ring-1 ring-amber-100',
    hover: 'hover:border-amber-200/80',
    glow: 'group-hover:from-amber-50/60',
  },
];

const steps = [
  { n: 1, text: 'Teacher uploads a CSV word list — format: "1A,curious" for Lesson 1A, word "curious"', dot: 'bg-indigo-500' },
  { n: 2, text: 'Each word is automatically scored High, Medium, Low, or Unknown difficulty based on word frequency data', dot: 'bg-violet-500' },
  { n: 3, text: 'Student logs in, selects a lesson, and practices one word at a time', dot: 'bg-sky-500' },
  { n: 4, text: 'For each word: read a passage, then answer 4 questions — MCQ meaning, 2 comprehension, and fill-in-blank', dot: 'bg-teal-500' },
  { n: 5, text: 'After all words, complete a dictation exercise. Wrong answers are re-tested inline before the session ends', dot: 'bg-emerald-500' },
  { n: 6, text: 'Practice Mistake Pick: find and correct grammar mistakes in sentences — like the gaokao error-correction section', dot: 'bg-purple-500' },
  { n: 7, text: 'Review all mistakes in the Tricky Words bank and re-practice until mastered', dot: 'bg-rose-500' },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const features = isTeacher ? teacherFeatures : studentFeatures;

  return (
    <div className="space-y-20">

      {/* Hero */}
      <div className="relative -mx-4 sm:-mx-6 px-8 sm:px-14 pt-16 pb-14 rounded-3xl overflow-hidden bg-gradient-to-br from-orange-50 via-violet-50/70 to-sky-50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-200 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-200 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/3 right-1/3 w-56 h-56 bg-amber-100 rounded-full opacity-30 blur-2xl pointer-events-none" />

        {/* Decorative sparkles — subtle, fade into background */}
        {!isTeacher && (
          <>
            <svg className="absolute top-8 right-12 w-5 h-5 text-amber-300/70 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <svg className="absolute bottom-12 right-32 w-3 h-3 text-violet-300/70 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <svg className="absolute top-1/2 right-6 w-4 h-4 text-sky-300/60 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </>
        )}

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-indigo-100 rounded-full px-3.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {isTeacher ? 'Teacher Dashboard' : 'English Vocabulary Practice'}
          </div>

          <h1 className="max-w-2xl text-5xl sm:text-6xl text-slate-900 leading-[1.06]">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-500 bg-clip-text text-transparent">
              {isTeacher ? 'Manage your' : 'Build your'}
            </span>
            <br />
            {isTeacher ? 'students' : 'vocabulary'}
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed font-light">
            {isTeacher
              ? 'Upload word lists, configure question types per student, and monitor progress through the SQL portal.'
              : 'Practice with reading passages, AI-generated questions, fill-in-the-blank exercises, and dictation — all designed for primary school students.'}
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-100 to-amber-100" />
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
            <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            What&apos;s inside
          </p>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-100 to-amber-100" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {features.map(({ href, icon, title, desc, iconBg, hover, glow }) => (
            <Link
              key={title}
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

      {/* How it works — students and logged-out only */}
      {!isTeacher && (
        <div className="space-y-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-100 to-amber-100" />
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
              <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              How it works
            </p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-100 to-amber-100" />
          </div>

          <div className="relative pl-10">
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
      )}

    </div>
  );
}
