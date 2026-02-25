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

  const parts = data.question.split('___');
  const hasSplit = parts.length === 2;

  function submit() {
    if (!typed.trim() || submitted) return;
    const correct = typed.trim().toLowerCase() === data.answer.trim().toLowerCase();
    onAnswer(questionKey, typed.trim(), correct);
  }

  return (
    <div className="space-y-3">
      {/* Question with inline blank */}
      {hasSplit ? (
        <p className="text-sm font-medium text-slate-800 leading-relaxed">
          {parts[0]}
          {submitted ? (
            <span className={`inline-block px-2 py-0.5 mx-1 rounded font-semibold text-sm ${
              isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {isCorrect ? typed : data.answer}
            </span>
          ) : (
            <span className="inline-block w-24 mx-1 border-b-2 border-indigo-400 align-bottom" />
          )}
          {parts[1]}
        </p>
      ) : (
        <p className="text-sm font-medium text-slate-800 leading-relaxed">{data.question}</p>
      )}

      {/* Input */}
      {!submitted ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Type your answer…"
            autoComplete="off"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
          />
          <button
            onClick={submit}
            disabled={!typed.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            Check
          </button>
        </div>
      ) : (
        <div className={`flex items-center gap-2 text-sm font-medium ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
          {isCorrect
            ? <>✓ Correct — &ldquo;{typed}&rdquo;</>
            : <>✗ The answer is &ldquo;{data.answer}&rdquo;</>
          }
        </div>
      )}

      {submitted && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          {data.explanation}
        </p>
      )}
    </div>
  );
}
