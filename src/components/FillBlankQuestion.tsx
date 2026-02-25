'use client';

import { useState } from 'react';
import { FillBlankData } from '@/lib/claude';

interface Props {
  questionKey: string;
  data: FillBlankData;
  submitted: boolean;
  isCorrect: boolean;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

export default function FillBlankQuestion({ questionKey, data, submitted, isCorrect, onAnswer }: Props) {
  const [typed, setTyped] = useState('');

  // Split the question on "___" to render the blank inline
  const parts = data.question.split('___');
  const hasSplit = parts.length === 2;

  function submit() {
    if (!typed.trim() || submitted) return;
    const correct = typed.trim().toLowerCase() === data.answer.trim().toLowerCase();
    onAnswer(questionKey, typed.trim(), correct);
  }

  return (
    <div className="space-y-2">
      {/* Question with inline blank or full question text */}
      {hasSplit ? (
        <p className="font-semibold text-gray-800 text-sm leading-relaxed">
          {parts[0]}
          {submitted ? (
            <span className={`inline-block px-2 py-0.5 rounded font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isCorrect ? typed : data.answer}
            </span>
          ) : (
            <span className="inline-block border-b-2 border-purple-400 min-w-[80px] mx-1" />
          )}
          {parts[1]}
        </p>
      ) : (
        <p className="font-semibold text-gray-800 text-sm">{data.question}</p>
      )}

      {/* Input row */}
      {!submitted ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Type your answer..."
            autoComplete="off"
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 transition-colors"
          />
          <button
            onClick={submit}
            disabled={!typed.trim()}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
          >
            Check
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          {isCorrect ? (
            <span className="text-green-700 font-bold">✅ Correct! &ldquo;{typed}&rdquo;</span>
          ) : (
            <span className="text-red-700 font-bold">❌ Answer: &ldquo;{data.answer}&rdquo;</span>
          )}
        </div>
      )}

      {submitted && (
        <p className="text-xs text-gray-500 italic">💡 {data.explanation}</p>
      )}
    </div>
  );
}
