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
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
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

  useEffect(() => {
    if (!selectedLesson) return;
    setLoadingWords(true);
    setError('');
    setWords([]);
    fetch(`/api/words?lesson=${encodeURIComponent(selectedLesson)}`)
      .then((r) => r.json())
      .then((d) => {
        const wordList = (d.words ?? []) as Array<{ id: number; word: string }>;
        setWords(wordList.map((w) => ({ id: Number(w.id), word: w.word as string })));
      })
      .catch(() => setError('Could not load words for this lesson.'))
      .finally(() => setLoadingWords(false));
  }, [selectedLesson]);

  function handleDone() {
    setPracticing(false);
    setSelectedLesson(null);
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
          onClick={() => setPracticing(false)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to lesson selection
        </button>
        <PracticeSession words={words} lessonNumber={selectedLesson!} onDone={handleDone} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900">Practice</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Select a lesson to practice. You will go through each word with reading, questions, and dictation.
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
          <div className="flex flex-wrap gap-2">
            {lessons.map((lesson) => (
              <button
                key={lesson}
                onClick={() => { setSelectedLesson(lesson); setPracticing(false); }}
                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  selectedLesson === lesson
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                Lesson {lesson}
              </button>
            ))}
          </div>
        )}

        {selectedLesson && (
          <div className="pt-4 border-t border-slate-100">
            {loadingWords ? (
              <div className="animate-pulse flex gap-2 flex-wrap">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 w-20 bg-slate-100 rounded-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : words.length === 0 ? (
              <p className="text-sm text-slate-400">No words found for Lesson {selectedLesson}.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  {words.length} word{words.length !== 1 ? 's' : ''} in Lesson {selectedLesson}
                </p>
                <div className="flex flex-wrap gap-2">
                  {words.map((w) => (
                    <span
                      key={w.id}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100"
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setPracticing(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-sm"
                >
                  Start Practice — {words.length} word{words.length !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
