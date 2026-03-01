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
  const [lastLesson, setLastLesson] = useState<string | null>(null);
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
        else {
          setLastLesson(d.user.lastLesson ?? null);
          setAuthChecked(true);
        }
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

  useEffect(() => {
    if (!selectedLesson) return;
    setLoadingWords(true);
    setError('');
    setWords([]);
    setPracticing(false);
    // Persist the selected lesson as the user's last tried lesson
    fetch('/api/practice/last-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson: selectedLesson }),
    }).then(() => setLastLesson(selectedLesson)).catch(() => {});
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
      <div className="space-y-5">
        <div className="h-8 bg-slate-100 rounded-xl w-32 animate-pulse" />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
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
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Practice</h1>
        <p className="text-slate-400 mt-1 text-sm">Choose a lesson below to begin practising.</p>
      </div>

      {/* Lesson picker */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a Lesson</p>

        {lessons.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">No lessons yet</p>
            <p className="text-sm text-slate-400">
              Ask your teacher to{' '}
              <a href="/upload" className="text-indigo-600 hover:underline font-semibold">
                upload a word list
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {lessons.map((lesson) => {
                const isSelected = selectedLesson === lesson;
                const isLast = !isSelected && lastLesson === lesson;
                return (
                  <button
                    key={lesson}
                    onClick={() => setSelectedLesson(lesson)}
                    disabled={loadingWords}
                    className={`
                      relative group flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border text-sm font-semibold transition-all duration-150 disabled:opacity-50
                      ${isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                        : isLast
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:border-indigo-400 hover:-translate-y-0.5 hover:shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:-translate-y-0.5 hover:shadow-sm'
                      }
                    `}
                  >
                    <svg
                      className={`w-4 h-4 ${isSelected ? 'text-indigo-200' : isLast ? 'text-indigo-400' : 'text-slate-300 group-hover:text-indigo-400'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs leading-tight text-center">Lesson<br />{lesson}</span>
                    {isLast && (
                      <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        Last
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {loadingWords && (
              <div className="flex items-center gap-2 text-sm text-slate-400 px-1 pt-1">
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
