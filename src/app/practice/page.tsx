'use client';

import { useState } from 'react';
import DifficultyFilter, { DifficultyLevel } from '@/components/DifficultyFilter';
import QuestionCard from '@/components/QuestionCard';
import { GeneratedQuestions } from '@/lib/claude';

interface PracticeData {
  word: string;
  wordId: number;
  questionId: number;
  questions: GeneratedQuestions;
}

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PracticeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickWord = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(difficulty !== 'all' ? { difficulty } : {}),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to generate questions');

      setData({
        word: json.word,
        wordId: json.wordId,
        questionId: json.questionId,
        questions: json.questions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">✏️</div>
        <h1 className="text-4xl font-black text-gray-800">Practice Words</h1>
        <p className="text-lg text-gray-600 font-medium">
          Choose a difficulty level, then pick a word to practise!
        </p>
      </div>

      {/* Difficulty filter */}
      <div className="bg-white rounded-3xl shadow-md p-5 border-2 border-purple-100 space-y-4">
        <p className="text-center font-black text-gray-700 text-lg">Choose Difficulty</p>
        <DifficultyFilter value={difficulty} onChange={setDifficulty} />
        <button
          onClick={pickWord}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black text-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <span className="animate-spin text-2xl">⏳</span>
              <span>Generating questions... (this takes a few seconds)</span>
            </>
          ) : (
            <>
              <span>🎲</span>
              <span>Pick a Word!</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-center">
          <p className="text-red-700 font-bold">❌ {error}</p>
          {error.includes('upload') && (
            <a href="/upload" className="text-purple-600 underline font-bold mt-1 block">
              Go upload a word list →
            </a>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-purple-100 space-y-4 animate-pulse">
          <div className="h-8 bg-purple-100 rounded-xl w-1/3" />
          <div className="h-4 bg-gray-100 rounded-xl w-full" />
          <div className="h-4 bg-gray-100 rounded-xl w-3/4" />
          <div className="h-4 bg-gray-100 rounded-xl w-5/6" />
          <div className="h-4 bg-gray-100 rounded-xl w-2/3" />
        </div>
      )}

      {data && !loading && (
        <QuestionCard
          word={data.word}
          questionId={data.questionId}
          questions={data.questions}
        />
      )}

      {data && !loading && (
        <div className="text-center">
          <button
            onClick={pickWord}
            className="px-8 py-3 bg-white border-2 border-purple-400 text-purple-600 rounded-2xl font-black text-base hover:bg-purple-50 transition-colors"
          >
            🔀 Try Another Word
          </button>
        </div>
      )}
    </div>
  );
}
