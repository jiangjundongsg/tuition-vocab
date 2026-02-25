'use client';

import { useState, useEffect } from 'react';
import DifficultyFilter from '@/components/DifficultyFilter';
import PracticeSession from '@/components/PracticeSession';
import { WordSetQuestions } from '@/lib/claude';

type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';

interface SessionData {
  wordSetId: number;
  words: string[];
  questions: WordSetQuestions;
}

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('all');
  const [lessonNumber, setLessonNumber] = useState<number | null>(null);
  const [availableLessons, setAvailableLessons] = useState<number[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/words')
      .then((r) => r.json())
      .then((d) => setAvailableLessons(d.lessonNumbers ?? []))
      .catch(() => {});
  }, []);

  async function pickWords() {
    setLoading(true);
    setError('');
    setSession(null);

    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: difficulty === 'all' ? undefined : difficulty,
          lessonNumber: lessonNumber ?? undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      setSession({ wordSetId: data.wordSetId, words: data.words, questions: data.questions });
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Practice Words</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Select a difficulty and lesson, then start a 5-word session with AI-generated questions.
        </p>
      </div>

      {/* Filter card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">

        {/* Difficulty */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Difficulty</p>
          <DifficultyFilter value={difficulty} onChange={(v) => setDifficulty(v as DifficultyLevel)} />
        </div>

        {/* Lesson filter */}
        {availableLessons.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Lesson <span className="text-slate-400 font-normal">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLessonNumber(null)}
                className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  lessonNumber === null
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
                }`}
              >
                All
              </button>
              {availableLessons.map((n) => (
                <button
                  key={n}
                  onClick={() => setLessonNumber(n)}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    lessonNumber === n
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
                  }`}
                >
                  Lesson {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={pickWords}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Generating questions…' : 'Start Session — 5 Words'}
          </button>
          {session && !loading && (
            <button
              onClick={pickWords}
              className="px-4 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors"
            >
              New set
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
          {error.includes('No words') && (
            <a href="/upload" className="ml-2 underline font-semibold">Upload a word list →</a>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-40 border border-slate-200" />
          ))}
        </div>
      )}

      {/* Session */}
      {session && !loading && (
        <PracticeSession wordSetId={session.wordSetId} questions={session.questions} />
      )}
    </div>
  );
}
