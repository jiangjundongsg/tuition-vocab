import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

const Star = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const studentFeatures = [
  {
    href: '/practice',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: 'Word by Word',
    desc: 'Read a passage, answer MCQ and comprehension questions, then fill in the blanks.',
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
  },
  {
    href: '/dictation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Dictation',
    desc: 'Listen to each word spoken aloud and type it correctly to complete the lesson.',
  },
  {
    href: '/mistake-pick',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    title: 'Mistake Pick',
    desc: 'Find and correct grammar mistakes in sentences — sharpening careful, precise reading.',
  },
];

const teacherFeatures = [
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Upload Words',
    desc: 'Upload a CSV, photo, or PDF word list and assign it to one or more students.',
  },
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Manage Users',
    desc: 'Edit student profiles, configure question types, and manage accounts.',
  },
  {
    href: '/words',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm0 5h16" />
      </svg>
    ),
    title: 'SQL Portal',
    desc: 'Run SELECT, INSERT, UPDATE, DELETE queries directly on the database.',
  },
];

const steps = [
  { n: 1, text: 'Teacher uploads a CSV word list — format: "1A,curious" for Lesson 1A, word "curious".' },
  { n: 2, text: 'Each word is automatically scored High, Medium, Low, or Unknown difficulty based on word-frequency data.' },
  { n: 3, text: 'Student logs in, selects a lesson, and practices one word at a time.' },
  { n: 4, text: 'For each word: read a passage, then answer questions — MCQ meaning, comprehension, and fill-in-blank.' },
  { n: 5, text: 'After all words, complete a dictation exercise. Wrong answers are re-tested inline before the session ends.' },
  { n: 6, text: 'Practice Mistake Pick: find and correct a single grammar mistake in each sentence.' },
  { n: 7, text: 'Review every mistake in the Tricky Words bank and re-practise until mastered.' },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-stone-200" />
      <p className="kicker flex items-center gap-1.5 shrink-0">
        <Star className="w-2.5 h-2.5 text-amber-500" />
        {children}
      </p>
      <div className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const features = isTeacher ? teacherFeatures : studentFeatures;

  // A student awaiting (or denied) teacher approval can't practice yet.
  if (user?.role === 'student' && user.status !== 'approved') {
    const rejected = user.status === 'rejected';
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md text-center bg-white rounded-xl border border-stone-200 shadow-sm p-10">
          <p className="kicker mb-4">{rejected ? 'Account status' : 'Pending review'}</p>
          <h1 className="text-3xl text-stone-900 mb-3">
            {rejected ? 'Request not approved' : 'Waiting for approval'}
          </h1>
          <p className="font-serif text-stone-500 leading-relaxed">
            {rejected
              ? 'Your teacher did not approve this account. Please check the Teacher ID you used, or ask your teacher to add you.'
              : `Your account is set up. Your teacher (ID ${user.teacherId ?? '—'}) just needs to approve you before you can start practising. Check back soon.`}
          </p>
          <p className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400">
            <span className={`w-1.5 h-1.5 rounded-full ${rejected ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
            {user.displayName ?? user.username}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">

      {/* Masthead */}
      <header className="pt-6 pb-10 border-b border-stone-200">
        <p className="kicker mb-5">
          {isTeacher ? 'Teacher Dashboard' : 'English Vocabulary Practice'}
        </p>
        <h1 className="max-w-3xl text-5xl sm:text-6xl text-stone-900 leading-[1.05]">
          {isTeacher ? 'Manage your students' : 'Build your vocabulary, word by word'}
        </h1>
        <p className="mt-6 max-w-2xl font-serif text-lg text-stone-500 leading-relaxed">
          {isTeacher
            ? 'Upload word lists, configure question types per student, and monitor progress — all from one place.'
            : 'A reading-led method for primary school students: contextual passages, AI-generated questions, fill-in-the-blank, and dictation that builds vocabulary that lasts.'}
        </p>
      </header>

      {/* Feature index */}
      <section className="space-y-6">
        <Kicker>What&apos;s inside</Kicker>
        <div className="grid sm:grid-cols-2 gap-px bg-stone-200 rounded-xl overflow-hidden border border-stone-200">
          {features.map(({ href, icon, title, desc }) => (
            <Link
              key={title}
              href={href}
              className="group bg-white p-6 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors shrink-0">
                  {icon}
                </div>
                <div>
                  <h3 className="font-display text-lg text-stone-900 leading-tight mb-1 group-hover:text-indigo-700 transition-colors">{title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works — students and logged-out only */}
      {!isTeacher && (
        <section className="space-y-6 pb-4">
          <Kicker>How it works</Kicker>
          <ol className="border-t border-stone-200">
            {steps.map(({ n, text }) => (
              <li key={n} className="flex items-baseline gap-5 py-4 border-b border-stone-200">
                <span className="font-display text-xl text-indigo-600 w-6 shrink-0 tabular-nums">{n}</span>
                <p className="font-serif text-[15px] text-stone-600 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

    </div>
  );
}
