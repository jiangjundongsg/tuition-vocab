'use client';

import { useState } from 'react';
import { FillBlankQuestion } from '@/lib/fillblank';

interface Props {
  questionKey: string;
  data: FillBlankQuestion;
  submitted: boolean;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

export default function FillBlankExercise({ questionKey, data, submitted, onAnswer }: Props) {
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState<Record<number, boolean>>({});

  function setInput(id: number, value: string) {
    setInputs((prev) => ({ ...prev, [id]: value }));
  }

  function check() {
    if (submitted || checked) return;
    const allFilled = data.blanks.every((b) => (inputs[b.id] ?? '').trim().length > 0);
    if (!allFilled) return;

    const results: Record<number, boolean> = {};
    let allCorrect = true;
    for (const blank of data.blanks) {
      const userAnswer = (inputs[blank.id] ?? '').trim().toLowerCase();
      const isCorrect = userAnswer === blank.original.toLowerCase();
      results[blank.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    }
    setCorrect(results);
    setChecked(true);
    onAnswer(questionKey, JSON.stringify(inputs), allCorrect);
  }

  // Split displayText on {{N}} placeholders and render inline inputs
  const parts = data.displayText.split(/(\{\{\d+\}\})/g);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Fill in the Blanks
      </p>
      <p className="text-xs text-slate-400">
        Each blank shows the first letter as a hint. Fill in the complete word.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
        {parts.map((part, i) => {
          const match = part.match(/^\{\{(\d+)\}\}$/);
          if (match) {
            const id = parseInt(match[1]);
            const blank = data.blanks.find((b) => b.id === id);
            if (!blank) return null;

            const val = inputs[id] ?? '';
            const isChecked = checked;
            const isCorrect = correct[id];

            return (
              <span key={i} className="inline-flex flex-col items-center mx-1 align-middle">
                <span className="text-xs text-blue-600 font-mono font-bold">{blank.hint}</span>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setInput(id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                  disabled={isChecked || submitted}
                  placeholder="..."
                  className={`w-24 border rounded px-2 py-0.5 text-center text-sm font-medium focus:outline-none transition-colors ${
                    !isChecked
                      ? 'border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      : isCorrect
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-red-400 bg-red-50 text-red-800'
                  }`}
                />
                {isChecked && !isCorrect && (
                  <span className="text-xs text-emerald-600 font-semibold">{blank.original}</span>
                )}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {!checked && !submitted && (
        <button
          onClick={check}
          disabled={!data.blanks.every((b) => (inputs[b.id] ?? '').trim().length > 0)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
        >
          Check Answers
        </button>
      )}

      {checked && (
        <p className={`text-xs px-3 py-2 rounded-lg border ${
          Object.values(correct).every(Boolean)
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {Object.values(correct).every(Boolean)
            ? 'All blanks correct!'
            : `${Object.values(correct).filter(Boolean).length} of ${data.blanks.length} correct. The correct answers are highlighted above.`}
        </p>
      )}
    </div>
  );
}
