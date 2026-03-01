'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PracticeSession from '@/components/PracticeSession';

interface WordInfo {
  id: number;
  word: string;
}

export default function PracticePage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [words, setWords] = useState<WordInfo[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.replace('/login?message=login-required');
        else setAuthChecked(true);
      })
      .catch(() => router.replace('/login?message=login-required'));
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons ?? []))
      .catch(() => {});
  }, [authChecked]);

  // When a lesson is selected, fetch its words and start immediately
  useEffect(() => {
    if (!selectedLesson) return;
    setLoadingWords(true);
    setError('');
    setWords([]);
    setPracticing(false);
    fetch(`/api/words?lesson=${encodeURIComponent(selectedLesson)}`)
      .then((r) => r.json())
      .then((d) => {
        const wordList = (d.words ?? []) as Array<{ id: number; word: string }>;
        const mapped = wordList.map((w) => ({ id: Number(w.id), word: w.word as string }));
        if (mapped.length === 0) {
          setError('No words found for this lesson.');
        } else {
          setWords(mapped);
          setPracticing(true);
        }
      })
      .catch(() => setError('Could not load words for this lesson.'))
      .finally(() => setLoadingWords(false));
  }, [selectedLesson]);

  function handleDone() {
    setPracticing(false);
    setSelectedLesson('');
    setWords([]);
  }

  if (!authChecked) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-100 rounded w-40" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (practicing && words.length > 0) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleDone}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to lesson selection
        </button>
        <PracticeSession words={words} lessonNumber={selectedLesson} onDone={handleDone} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900">Practice</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Choose a lesson from the list below to begin practising.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a Lesson</p>

        {lessons.length === 0 ? (
          <p className="text-sm text-slate-400">
            No lessons available yet.{' '}
            <a href="/upload" className="text-indigo-600 hover:underline font-semibold">
              Upload a word list →
            </a>
          </p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              disabled={loadingWords}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60 transition-colors shadow-sm appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '40px' }}
            >
              <option value="">— Choose a lesson —</option>
              {lessons.map((lesson) => (
                <option key={lesson} value={lesson}>
                  Lesson {lesson}
                </option>
              ))}
            </select>

            {loadingWords && (
              <div className="flex items-center gap-2 text-sm text-slate-400 px-1">
                <span className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                Loading lesson words…
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 px-1">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
