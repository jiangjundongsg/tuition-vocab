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

  // Fetch available lesson numbers
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-purple-700 mb-2">✏️ Practice Words</h1>
        <p className="text-gray-500">Pick 5 words and answer all questions in one go!</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 space-y-4">
        {/* Difficulty filter */}
        <div>
          <p className="text-sm font-bold text-gray-600 mb-3">Choose difficulty:</p>
          <DifficultyFilter value={difficulty} onChange={(v) => setDifficulty(v as DifficultyLevel)} />
        </div>

        {/* Lesson number filter */}
        {availableLessons.length > 0 && (
          <div>
            <p className="text-sm font-bold text-gray-600 mb-2">Choose lesson <span className="font-normal text-gray-400">(optional)</span>:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLessonNumber(null)}
                className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                  lessonNumber === null
                    ? 'bg-purple-500 text-white border-purple-500 shadow-md scale-105'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300'
                }`}
              >
                All Lessons
              </button>
              {availableLessons.map((n) => (
                <button
                  key={n}
                  onClick={() => setLessonNumber(n)}
                  className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-all ${
                    lessonNumber === n
                      ? 'bg-purple-500 text-white border-purple-500 shadow-md scale-105'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300'
                  }`}
                >
                  Lesson {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={pickWords}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? '✨ Generating questions...' : '🎯 Pick 5 Words!'}
        </button>
        {session && !loading && (
          <button
            onClick={pickWords}
            className="w-full text-purple-600 font-bold text-sm py-2 rounded-xl hover:bg-purple-50 transition-all"
          >
            🔄 Try a different set
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          {error}
          {error.includes('No words') && (
            <a href="/upload" className="ml-2 underline font-bold">Upload words →</a>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 h-40 border border-gray-100" />
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
