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

      {/* Paragraph with inline blank inputs — inputs bottom-aligned with text */}
      <div
        className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700"
        style={{ lineHeight: '2.4' }}
      >
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
              <span
                key={i}
                style={{ display: 'inline-flex', alignItems: 'flex-end', verticalAlign: 'bottom', margin: '0 2px' }}
              >
                {/* First-letter hint */}
                <span
                  style={{
                    fontSize: '0.8em',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    paddingBottom: '2px',
                    color: !isChecked ? '#2563eb' : isCorrect ? '#059669' : '#dc2626',
                    userSelect: 'none',
                  }}
                >
                  {blank.original[0]}
                </span>
                {/* Underline input — bottom aligned */}
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setInput(id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                  disabled={isChecked || submitted}
                  placeholder="___"
                  style={{
                    border: 'none',
                    borderBottom: `2px solid ${
                      !isChecked ? '#93c5fd' : isCorrect ? '#6ee7b7' : '#fca5a5'
                    }`,
                    background: isChecked
                      ? isCorrect ? '#ecfdf5' : '#fff1f2'
                      : 'transparent',
                    width: `${Math.max(blank.original.length * 9, 48)}px`,
                    padding: '0 2px 0 0',
                    fontSize: 'inherit',
                    textAlign: 'center',
                    outline: 'none',
                    color: !isChecked ? '#1e3a5f' : isCorrect ? '#065f46' : '#991b1b',
                    fontWeight: 600,
                  }}
                />
                {/* Correct answer shown below if wrong */}
                {isChecked && !isCorrect && (
                  <span
                    style={{
                      fontSize: '0.7em',
                      color: '#059669',
                      fontWeight: 700,
                      paddingBottom: '2px',
                      marginLeft: '2px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ({blank.original})
                  </span>
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
            : `${Object.values(correct).filter(Boolean).length} of ${data.blanks.length} correct. Correct answers shown in brackets.`}
        </p>
      )}
    </div>
  );
}
